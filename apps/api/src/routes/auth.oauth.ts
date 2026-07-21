import { Hono, type Context } from 'hono';
import pino from 'pino';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { OAuthFinalizarRoleChoiceSchema } from '@pdc/shared';
import { env } from '../lib/env.js';
import { authService } from '../modules/auth/auth.service.js';
import {
  getOAuthCookieOptions,
  setAuthCookies,
} from '../modules/auth/auth.helper.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { oauthOnboardingService } from '../modules/auth/oauth-onboarding.service.js';
import { authSessionService } from '../modules/auth/auth-session.service.js';
import { oauthStateService } from '../modules/auth/oauth-state.service.js';
import { REFRESH_TOKEN_COOKIE } from '../modules/auth/auth.constants.js';
import { RefreshTokenReuseError } from '../modules/auth/auth-session.errors.js';
import { AuthDomainError } from '../modules/auth/auth.errors.js';

const log = pino({ name: 'oauth-routes' });
export const oauthRoutes = new Hono<{ Variables: AuthVariables }>();
const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_FETCH_TIMEOUT_MS = 5_000;
const OAuthTokenResponseSchema = z.object({ access_token: z.string().min(1) });
const OAuthUserInfoSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
});

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

async function consumeOAuthState(
  c: Context<{ Variables: AuthVariables }>,
  state: string | undefined,
): Promise<boolean> {
  const browserState = getCookie(c, OAUTH_STATE_COOKIE);
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/auth' });
  return oauthStateService.consume(state, browserState);
}

function extractErrorDetails(err: unknown): { status: 400 | 404 | 500; message: string } {
  if (err instanceof AuthDomainError && (err.status === 400 || err.status === 404)) {
    return { status: err.status, message: err.message };
  }
  return { status: 500, message: 'Erro interno' };
}

async function setNewSession(
  c: Context<{ Variables: AuthVariables }>,
  user: Awaited<ReturnType<typeof authService.getUserById>>,
): Promise<void> {
  const session = await authSessionService.issue(user);
  setAuthCookies(c, session);
}

async function rotateCurrentSession(
  c: Context<{ Variables: AuthVariables }>,
  user: Awaited<ReturnType<typeof authService.getUserById>>,
): Promise<void> {
  const currentRefreshToken = getCookie(c, REFRESH_TOKEN_COOKIE);
  if (!currentRefreshToken) {
    throw new AuthDomainError('Sessão expirada', 400);
  }
  let session;
  try {
    session = await authSessionService.rotate(currentRefreshToken, user);
  } catch (error) {
    if (error instanceof RefreshTokenReuseError) {
      throw new AuthDomainError('Sessão expirada', 400);
    }
    throw error;
  }
  if (!session) throw new AuthDomainError('Sessão expirada', 400);
  setAuthCookies(c, session);
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
  if (env.NODE_ENV === 'production') {
    if (!configured) throw new Error(`OAuth ${provider} não configurado: redirect URI em falta`);
    return configured;
  }
  if (configured) return configured;
  const origin = getRequestOrigin(c);
  if (c.req.header('x-pdc-public-origin')) return `${origin}/auth/${provider}/callback`;
  if (c.req.header('x-forwarded-host')) return `${origin}/auth/${provider}/callback`;
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
    const { clientId } = requireOAuthEnv('google');
    const state = await oauthStateService.issue();
    setCookie(c, OAUTH_STATE_COOKIE, state, getOAuthCookieOptions(oauthStateService.ttlSeconds));
    const redirectUri = getOAuthRedirectUri(c, 'google');
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
  let isValidState: boolean;
  try {
    isValidState = await consumeOAuthState(c, state);
  } catch (err) {
    log.error({ err, provider: 'google' }, 'Google OAuth state unavailable');
    return redirectOAuthUnavailable(c, 'google');
  }
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
      signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
    });
    if (!tokenRes.ok) return c.json({ error: 'Token error' }, 400);
    const tokenResult = OAuthTokenResponseSchema.safeParse(await tokenRes.json());
    if (!tokenResult.success) return c.json({ error: 'Token error' }, 400);
    const tokens = tokenResult.data;
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
    });
    if (!userRes.ok) return c.json({ error: 'Perfil Google indisponível' }, 400);
    const googleUserResult = OAuthUserInfoSchema.safeParse(await userRes.json());
    if (!googleUserResult.success) {
      return c.json({ error: 'Email não disponível da conta Google' }, 400);
    }
    const googleUser = googleUserResult.data;
    const user = await authService.findOrCreateUser(googleUser.email, googleUser.name ?? googleUser.email);
    await setNewSession(c, user);

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
    const { clientId } = requireOAuthEnv('linkedin');
    const state = await oauthStateService.issue();
    setCookie(c, OAUTH_STATE_COOKIE, state, getOAuthCookieOptions(oauthStateService.ttlSeconds));
    const redirectUri = getOAuthRedirectUri(c, 'linkedin');
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
  let isValidState: boolean;
  try {
    isValidState = await consumeOAuthState(c, state);
  } catch (err) {
    log.error({ err, provider: 'linkedin' }, 'LinkedIn OAuth state unavailable');
    return redirectOAuthUnavailable(c, 'linkedin');
  }
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
      signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
    });
    if (!tokenRes.ok) return c.json({ error: 'Token error' }, 400);
    const tokenResult = OAuthTokenResponseSchema.safeParse(await tokenRes.json());
    if (!tokenResult.success) return c.json({ error: 'Token error' }, 400);
    const tokens = tokenResult.data;
    const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
    });
    if (!userRes.ok) return c.json({ error: 'Perfil LinkedIn indisponível' }, 400);
    const liUserResult = OAuthUserInfoSchema.safeParse(await userRes.json());
    if (!liUserResult.success) {
      return c.json({ error: 'Email não disponível da conta LinkedIn' }, 400);
    }
    const liUser = liUserResult.data;
    const user = await authService.findOrCreateUser(liUser.email, liUser.name ?? liUser.email);
    await setNewSession(c, user);

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
    await rotateCurrentSession(c, updatedUser);
    return c.json(updatedUser);
  } catch (err: unknown) {
    const { status, message } = extractErrorDetails(err);
    log.error({ err, userId: user.id }, 'escolherRole error');
    return c.json({ error: message }, status);
  }
});

oauthRoutes.post('/finalizar/verificar-otp', verifyJwt, zValidator('json', verificarOtpSchema), async (c) => {
  const user = c.get('user');
  const { otp } = c.req.valid('json');
  try {
    await oauthOnboardingService.verificarOtp(user.id, otp);
    const updatedUser = await authService.getUserById(user.id);
    // Mint fresh tokens so the JWT reflects the updated role and onboardingCompleto: true
    await rotateCurrentSession(c, updatedUser);
    return c.json(updatedUser);
  } catch (err: unknown) {
    const { status, message } = extractErrorDetails(err);
    log.error({ err, userId: user.id }, 'verificarOtp error');
    return c.json({ error: message }, status);
  }
});
