import { Hono, type Context } from 'hono';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import pino from 'pino';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { OAuthFinalizarRoleChoiceSchema } from '@pdc/shared';
import { hasRedis, redis } from '../lib/redis.js';
import { env } from '../lib/env.js';
import { authService } from '../modules/auth/auth.service.js';
import { setAuthCookies } from '../modules/auth/auth.helper.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { oauthOnboardingService } from '../modules/auth/oauth-onboarding.service.js';

const log = pino({ name: 'oauth-routes' });
export const oauthRoutes = new Hono<{ Variables: AuthVariables }>();
const OAUTH_STATE_TTL_SECONDS = 600;

function signOAuthStatePayload(payload: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(payload).digest('base64url');
}


function requireOAuthEnv(provider: 'google' | 'linkedin'): { clientId: string; clientSecret: string } {
  if (provider === 'google') {
    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('OAuth google não configurado: GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET em falta');
    }
    return { clientId, clientSecret };
  }
  const clientId = env.LINKEDIN_CLIENT_ID;
  const clientSecret = env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('OAuth linkedin não configurado: LINKEDIN_CLIENT_ID ou LINKEDIN_CLIENT_SECRET em falta');
  }
  return { clientId, clientSecret };
}
function createOAuthState(): string {
  const nonce = randomUUID();
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const payload = `${nonce}.${issuedAt}`;
  const signature = signOAuthStatePayload(payload);
  return `v1.${payload}.${signature}`;
}

function isValidOAuthState(state: string | undefined): state is string {
  if (!state) return false;
  const parts = state.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return false;

  const [, nonce, issuedAtRaw, signature] = parts;
  if (!nonce || !issuedAtRaw || !signature) return false;

  const issuedAt = Number.parseInt(issuedAtRaw, 10);
  if (!Number.isFinite(issuedAt)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (issuedAt > now + 30 || now - issuedAt > OAUTH_STATE_TTL_SECONDS) return false;

  const expected = signOAuthStatePayload(`${nonce}.${issuedAtRaw}`);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

async function persistOAuthState(state: string): Promise<void> {
  if (!hasRedis) {
    log.warn('Redis ausente; OAuth state assinado será validado sem proteção one-time.');
    return;
  }
  try {
    await redis.set(`oauth_state:${state}`, 'true', { ex: OAUTH_STATE_TTL_SECONDS });
  } catch (err) {
    // Degradação graceful: o state é assinado (HMAC) e tem TTL próprio; o Redis
    // apenas reforça a proteção one-time-use. Se o Redis falhar (ex.: quota
    // Upstash esgotada, erro transitório), validamos só por assinatura —
    // consumeOAuthState já retorna true quando !hasRedis. Não derrubar o fluxo
    // de OAuth por uma falha transitória de Redis.
    log.warn({ err }, 'Redis indisponível ao persistir OAuth state; a degradar para validação por assinatura.');
  }
}

async function consumeOAuthState(state: string | undefined): Promise<boolean> {
  if (!isValidOAuthState(state)) return false;
  if (!hasRedis) return true;

  const key = `oauth_state:${state}`;
  try {
    const exists = await redis.get(key);
    if (!exists) return false;
    await redis.del(key);
    return true;
  } catch (err) {
    // Degradação graceful: o state já foi validado por assinatura HMAC + TTL.
    // O Redis apenas reforça a proteção one-time-use. Se falhar (ex.: quota
    // Upstash esgotada), degradamos para validação por assinatura (consistente
    // com o caminho !hasRedis) em vez de derrubar o callback do OAuth com 500.
    log.warn({ err }, 'Redis indisponível ao consumir OAuth state; a validar só por assinatura.');
    return true;
  }
}

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

function redirectOAuthUnavailable(c: Context<{ Variables: AuthVariables }>, provider: 'google' | 'linkedin') {
  log.error({ provider }, 'OAuth callback unavailable');
  const url = new URL('/login', env.OAUTH_REDIRECT_BASE_URL);
  url.searchParams.set('error', 'oauth_unavailable');
  return c.redirect(url.toString());
}

oauthRoutes.get('/google', async (c) => {
  try {
    const state = createOAuthState();
    await persistOAuthState(state);
    const redirectUri = getOAuthRedirectUri(c, 'google');
    const { clientId } = requireOAuthEnv('google');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    });
    return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  } catch (err) {
    log.error({ err, provider: 'google' }, 'Google OAuth initiation error');
    return redirectOAuthUnavailable(c, 'google');
  }
});

oauthRoutes.get('/google/callback', async (c) => {
  const { code, state } = c.req.query();
  const isValidState = await consumeOAuthState(state);
  if (!isValidState) return c.json({ error: 'Invalid state' }, 400);
  if (!code) return c.json({ error: 'Código de autorização ausente' }, 400);

  try {
    const { clientId, clientSecret } = requireOAuthEnv('google');
    const redirectUri = getOAuthRedirectUri(c, 'google');
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
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
    return redirectOAuthUnavailable(c, 'google');
  }
});

oauthRoutes.get('/linkedin', async (c) => {
  try {
    const state = createOAuthState();
    await persistOAuthState(state);
    const redirectUri = getOAuthRedirectUri(c, 'linkedin');
    const { clientId } = requireOAuthEnv('linkedin');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    });
    return c.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`);
  } catch (err) {
    log.error({ err, provider: 'linkedin' }, 'LinkedIn OAuth initiation error');
    return redirectOAuthUnavailable(c, 'linkedin');
  }
});

oauthRoutes.get('/linkedin/callback', async (c) => {
  const { code, state } = c.req.query();
  const isValidState = await consumeOAuthState(state);
  if (!isValidState) return c.json({ error: 'Invalid state' }, 400);
  if (!code) return c.json({ error: 'Código de autorização ausente' }, 400);

  try {
    const { clientId, clientSecret } = requireOAuthEnv('linkedin');
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getOAuthRedirectUri(c, 'linkedin'),
      }),
    });
    if (!tokenRes.ok) return c.json({ error: 'Token error' }, 400);
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
  } catch (err) {
    log.error({ err }, 'LinkedIn callback error');
    return redirectOAuthUnavailable(c, 'linkedin');
  }
});

const verificarOtpSchema = z.object({
  otp: z.string().length(6),
});

oauthRoutes.post('/finalizar/escolher-role', verifyJwt, zValidator('json', OAuthFinalizarRoleChoiceSchema), async (c) => {
  const user = c.get('user');
  const payload = c.req.valid('json');
  try {
    await oauthOnboardingService.escolherRole(user.id, payload);
    const updatedUser = await authService.getUserById(user.id);
    const { accessToken, refreshToken } = await authService.generateTokens(updatedUser);
    await authService.saveRefreshToken(updatedUser.id, refreshToken);
    setAuthCookies(c, accessToken, refreshToken);
    return c.json(updatedUser);
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
