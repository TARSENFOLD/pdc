import { Hono, type Context } from 'hono';
import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { OAuthFinalizarRoleChoiceSchema } from '@pdc/shared';
import { redis } from '../lib/redis.js';
import { env } from '../lib/env.js';
import { authService } from '../modules/auth/auth.service.js';
import { setAuthCookies } from '../modules/auth/auth.helper.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { oauthOnboardingService } from '../modules/auth/oauth-onboarding.service.js';

const log = pino({ name: 'oauth-routes' });
export const oauthRoutes = new Hono<{ Variables: AuthVariables }>();

function extractErrorDetails(err: unknown): { status: number; message: string } {
  const status = (err !== null && typeof err === 'object' && 'status' in err)
    ? (err as { status: number }).status
    : 500;
  const message = err instanceof Error ? err.message : 'Erro interno';
  return { status, message };
}

function getRequestOrigin(c: Context<{ Variables: AuthVariables }>): string {
  const publicOrigin = c.req.header('x-pdc-public-origin');
  if (publicOrigin) return publicOrigin;
  const forwardedHost = c.req.header('x-forwarded-host');
  const forwardedProto = c.req.header('x-forwarded-proto') ?? 'https';
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  return new URL(c.req.url).origin;
}

function getOAuthRedirectUri(c: Context<{ Variables: AuthVariables }>, provider: 'google' | 'linkedin'): string {
  const configured = provider === 'google' ? env.GOOGLE_REDIRECT_URI : env.LINKEDIN_REDIRECT_URI;
  const origin = getRequestOrigin(c);
  if (c.req.header('x-pdc-public-origin')) return `${origin}/auth/${provider}/callback`;
  if (c.req.header('x-forwarded-host')) return `${origin}/auth/${provider}/callback`;
  if (origin === env.API_URL) return configured ?? `${origin}/auth/${provider}/callback`;
  return `${origin}/auth/${provider}/callback`;
}

oauthRoutes.get('/google', async (c) => {
  const state = randomUUID();
  await redis.set(`oauth_state:${state}`, 'true', { ex: 600 });
  const redirectUri = getOAuthRedirectUri(c, 'google');
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

oauthRoutes.get('/google/callback', async (c) => {
  const { code, state } = c.req.query();
  const exists = await redis.get(`oauth_state:${state ?? ''}`);
  if (!exists) return c.json({ error: 'Invalid state' }, 400);
  await redis.del(`oauth_state:${state ?? ''}`);

  try {
    const redirectUri = getOAuthRedirectUri(c, 'google');
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code || '',
        client_id: env.GOOGLE_CLIENT_ID || '',
        client_secret: env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) return c.json({ error: 'Token error' }, 400);
    const tokens = await tokenRes.json() as { access_token: string };
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userRes.json() as { email?: string; name?: string };
    if (!googleUser.email) return c.json({ error: 'Email não disponível da conta Google' }, 400);
    const user = await authService.findOrCreateUser(googleUser.email, googleUser.name ?? googleUser.email);
    const { accessToken, refreshToken } = await authService.generateTokens(user);
    await authService.saveRefreshToken(user.id, refreshToken);
    setAuthCookies(c, accessToken, refreshToken);

    void authService.setOauthProvider(user.id, 'google').catch((err: unknown) => {
      log.error({ err, userId: user.id }, 'Failed to set oauthProvider');
    });

    if (!user.oauthVerified || !user.onboardingCompleto) {
      const upgradeParam = user.onboardingCompleto === false ? '?upgrade=true' : '';
      return c.redirect(`${env.OAUTH_REDIRECT_BASE_URL}/criar-conta/finalizar${upgradeParam}`);
    }
    return c.redirect(`${env.OAUTH_REDIRECT_BASE_URL}/app`);
  } catch (err) {
    log.error({ err }, 'Google callback error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

oauthRoutes.get('/linkedin', async (c) => {
  const state = randomUUID();
  await redis.set(`oauth_state:${state}`, 'true', { ex: 600 });
  const redirectUri = getOAuthRedirectUri(c, 'linkedin');
  const params = new URLSearchParams({
    client_id: env.LINKEDIN_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });
  return c.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`);
});

oauthRoutes.get('/linkedin/callback', async (c) => {
  const { code, state } = c.req.query();
  const exists = await redis.get(`oauth_state:${state ?? ''}`);
  if (!exists) return c.json({ error: 'Invalid state' }, 400);
  await redis.del(`oauth_state:${state ?? ''}`);

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code || '',
      client_id: env.LINKEDIN_CLIENT_ID || '',
      client_secret: env.LINKEDIN_CLIENT_SECRET || '',
      redirect_uri: getOAuthRedirectUri(c, 'linkedin'),
    }),
  });
  const tokens = await tokenRes.json() as { access_token: string };
  const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const liUser = await userRes.json() as { email?: string; name?: string };
  if (!liUser.email) return c.json({ error: 'Email não disponível da conta LinkedIn' }, 400);
  const user = await authService.findOrCreateUser(liUser.email, liUser.name ?? liUser.email);
  const { accessToken, refreshToken } = await authService.generateTokens(user);
  await authService.saveRefreshToken(user.id, refreshToken);
  setAuthCookies(c, accessToken, refreshToken);

  void authService.setOauthProvider(user.id, 'linkedin').catch((err: unknown) => {
    log.error({ err, userId: user.id }, 'Failed to set oauthProvider');
  });

  if (!user.oauthVerified || !user.onboardingCompleto) {
    const upgradeParam = user.onboardingCompleto === false ? '?upgrade=true' : '';
    return c.redirect(`${env.OAUTH_REDIRECT_BASE_URL}/criar-conta/finalizar${upgradeParam}`);
  }
  return c.redirect(`${env.OAUTH_REDIRECT_BASE_URL}/app`);
});

const verificarOtpSchema = z.object({
  otp: z.string().length(6),
});

oauthRoutes.post('/finalizar/escolher-role', verifyJwt, zValidator('json', OAuthFinalizarRoleChoiceSchema), async (c) => {
  const user = c.get('user');
  const payload = c.req.valid('json');
  try {
    await oauthOnboardingService.escolherRole(user.id, payload);
    return c.json({ success: true });
  } catch (err: unknown) {
    const { status, message } = extractErrorDetails(err);
    log.error({ err, userId: user.id }, 'escolherRole error');
    return c.json({ error: message }, status as 400 | 404 | 500);
  }
});

oauthRoutes.post('/finalizar/verificar-otp', verifyJwt, zValidator('json', verificarOtpSchema), async (c) => {
  const user = c.get('user');
  const { otp } = c.req.valid('json');
  try {
    await oauthOnboardingService.verificarOtp(user.id, otp);
    const updatedUser = await authService.getUserById(user.id);
    // Mint fresh tokens so the JWT reflects the updated role and onboardingCompleto: true
    const { accessToken, refreshToken } = await authService.generateTokens(updatedUser);
    await authService.saveRefreshToken(updatedUser.id, refreshToken);
    setAuthCookies(c, accessToken, refreshToken);
    return c.json(updatedUser);
  } catch (err: unknown) {
    const { status, message } = extractErrorDetails(err);
    log.error({ err, userId: user.id }, 'verificarOtp error');
    return c.json({ error: message }, status as 400 | 404 | 500);
  }
});
