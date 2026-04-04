import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { authService } from '../modules/auth/auth.service.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { rateLimit, rateLimitRegisto } from '../middleware/rateLimit.js';
import { Redis } from '@upstash/redis';
import { randomUUID } from 'node:crypto';
import {
  RegistoEstudantePayloadSchema,
  RegistoMentorPayloadSchema,
  RegistoInstituicaoPayloadSchema,
} from '@pdc/shared';

export const authRoutes = new Hono<{ Variables: AuthVariables }>();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nome: z.string().min(2).max(100),
});

const isProd = process.env.NODE_ENV === 'production';

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
    })
  : null;

function setAuthCookies(
  c: Context<{ Variables: AuthVariables }>,
  accessToken: string,
  refreshToken: string
) {
  setCookie(c, 'access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Strict',
    maxAge: 15 * 60,
    path: '/',
  });
  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

authRoutes.use('/login', rateLimit);
authRoutes.use('/register', rateLimit);
authRoutes.use('/refresh', rateLimit);

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, nome } = c.req.valid('json');
  try {
    const user = await authService.register(email, password, nome);
    const { accessToken, refreshToken } = await authService.generateTokens(user);
    await authService.saveRefreshToken(user.id, refreshToken);
    setAuthCookies(c, accessToken, refreshToken);
    return c.json(user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return c.json({ error: message }, 400);
  }
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  try {
    const user = await authService.login(email, password);
    const { accessToken, refreshToken } = await authService.generateTokens(user);
    await authService.saveRefreshToken(user.id, refreshToken);
    setAuthCookies(c, accessToken, refreshToken);
    return c.json(user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return c.json({ error: message }, 401);
  }
});

authRoutes.post('/logout', verifyJwt, async (c) => {
  const user = c.get('user');
  const refreshToken = getCookie(c, 'refresh_token');
  if (refreshToken) {
    await authService.revokeRefreshToken(user.id, refreshToken);
  }
  deleteCookie(c, 'access_token');
  deleteCookie(c, 'refresh_token');
  return c.json({ success: true });
});

authRoutes.post('/refresh', async (c) => {
  const oldRefreshToken = getCookie(c, 'refresh_token');
  if (!oldRefreshToken) return c.json({ error: 'No refresh token' }, 401);

  const verified = await authService.verifyRefreshToken(oldRefreshToken);
  if (!verified) return c.json({ error: 'Invalid refresh token' }, 401);

  try {
    const user = await authService.getUserById(verified.userId);
    const { accessToken, refreshToken } = await authService.generateTokens(user);
    await authService.revokeRefreshToken(user.id, oldRefreshToken);
    await authService.saveRefreshToken(user.id, refreshToken);
    setAuthCookies(c, accessToken, refreshToken);
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Session expired' }, 401);
  }
});

authRoutes.get('/me', verifyJwt, async (c) => {
  const authUser = c.get('user');
  try {
    const user = await authService.getUserById(authUser.id);
    return c.json(user);
  } catch {
    return c.json({ error: 'User not found' }, 404);
  }
});

// ─── Google OAuth ─────────────────────────────────────────────────────────────

authRoutes.get('/google', async (c) => {
  const state = randomUUID();
  if (redis) {
    await redis.set(`oauth_state:${state}`, 'true', { ex: 600 });
  }
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback',
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

authRoutes.get('/google/callback', async (c) => {
  const { code, state } = c.req.query();
  if (redis) {
    const exists = await redis.get(`oauth_state:${state ?? ''}`);
    if (!exists) return c.json({ error: 'Invalid state' }, 400);
    await redis.del(`oauth_state:${state ?? ''}`);
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code || '',
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback',
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json() as { access_token: string };
  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const googleUser = await userRes.json() as { email: string; name: string };

  const user = await authService.findOrCreateUser(googleUser.email, googleUser.name);
  const { accessToken, refreshToken } = await authService.generateTokens(user);
  await authService.saveRefreshToken(user.id, refreshToken);
  setAuthCookies(c, accessToken, refreshToken);

  return c.redirect(`${process.env.OAUTH_REDIRECT_BASE_URL || 'http://localhost:3000'}/app/dashboard`);
});

// ─── LinkedIn OAuth ───────────────────────────────────────────────────────────

authRoutes.get('/linkedin', async (c) => {
  const state = randomUUID();
  if (redis) {
    await redis.set(`oauth_state:${state}`, 'true', { ex: 600 });
  }
  const params = new URLSearchParams({
    client_id: process.env.LINKEDIN_CLIENT_ID || '',
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/auth/linkedin/callback',
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });
  return c.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`);
});

authRoutes.get('/linkedin/callback', async (c) => {
  const { code, state } = c.req.query();
  if (redis) {
    const exists = await redis.get(`oauth_state:${state ?? ''}`);
    if (!exists) return c.json({ error: 'Invalid state' }, 400);
    await redis.del(`oauth_state:${state ?? ''}`);
  }

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code || '',
      client_id: process.env.LINKEDIN_CLIENT_ID || '',
      client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/auth/linkedin/callback',
    }),
  });

  const tokens = await tokenRes.json() as { access_token: string };
  const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const liUser = await userRes.json() as { email: string; name: string };

  const user = await authService.findOrCreateUser(liUser.email, liUser.name);
  const { accessToken, refreshToken } = await authService.generateTokens(user);
  await authService.saveRefreshToken(user.id, refreshToken);
  setAuthCookies(c, accessToken, refreshToken);

  return c.redirect(`${process.env.OAUTH_REDIRECT_BASE_URL || 'http://localhost:3000'}/app/dashboard`);
});

// ─── Registo por Tipo ─────────────────────────────────────────────────────────

authRoutes.use('/register/estudante', rateLimitRegisto);
authRoutes.use('/register/mentor', rateLimitRegisto);
authRoutes.use('/register/instituicao', rateLimitRegisto);

authRoutes.post(
  '/register/estudante',
  zValidator('json', RegistoEstudantePayloadSchema),
  async (c) => {
    const { email, password, nome, areaInteresse, nivelEnsino } = c.req.valid('json');
    try {
      const user = await authService.registerWithRole(email, password, nome, 'aluno', {
        areaInteresse,
        nivelEnsino,
      });
      const { accessToken, refreshToken } = await authService.generateTokens(user);
      await authService.saveRefreshToken(user.id, refreshToken);
      setAuthCookies(c, accessToken, refreshToken);
      return c.json(user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      return c.json({ error: message }, 400);
    }
  },
);

authRoutes.post(
  '/register/mentor',
  zValidator('json', RegistoMentorPayloadSchema),
  async (c) => {
    const { email, password, nome, areaEspecialidade, documentos } = c.req.valid('json');
    try {
      const user = await authService.registerWithRole(email, password, nome, 'mentor', {
        areaEspecialidade,
        documentos: documentos ?? [],
        aprovado: false,
      });
      const { accessToken, refreshToken } = await authService.generateTokens(user);
      await authService.saveRefreshToken(user.id, refreshToken);
      setAuthCookies(c, accessToken, refreshToken);
      return c.json(user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      return c.json({ error: message }, 400);
    }
  },
);

authRoutes.post(
  '/register/instituicao',
  zValidator('json', RegistoInstituicaoPayloadSchema),
  async (c) => {
    const { nomeInstituicao, email, password, regiao, tipo, documentos } = c.req.valid('json');
    try {
      const user = await authService.registerWithRole(email, password, nomeInstituicao, 'instituicao', {
        regiao,
        tipo,
        documentos: documentos ?? [],
        aprovado: false,
      });
      const { accessToken, refreshToken } = await authService.generateTokens(user);
      await authService.saveRefreshToken(user.id, refreshToken);
      setAuthCookies(c, accessToken, refreshToken);
      return c.json(user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      return c.json({ error: message }, 400);
    }
  },
);
