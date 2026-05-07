import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { deleteCookie, getCookie } from 'hono/cookie';
import { jwtVerify } from 'jose';
import { env } from '../lib/env.js';
import { authService } from '../modules/auth/auth.service.js';
import type { AuthVariables } from '../modules/auth/auth.middleware.js';
import { StrapiHttpError } from '../modules/strapi/strapi.client.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { setAuthCookies } from '../modules/auth/auth.helper.js';
import { initiate2faChallenge } from './auth.otp.js';
import { otpRoutes } from './auth.otp.js';
import { oauthRoutes } from './auth.oauth.js';
import { registerRoutes } from './auth.register.js';

export const authRoutes = new Hono<{ Variables: AuthVariables }>();
const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

// Montar sub-routers
authRoutes.route('/otp', otpRoutes);
authRoutes.route('/register', registerRoutes);
authRoutes.route('/', oauthRoutes);

const normalizedEmailSchema = z.string()
  .transform(e => e.toLowerCase().trim())
  .pipe(z.string().email());

const loginSchema = z.object({
  email: normalizedEmailSchema,
  password: z.string().min(8),
});

const registerSchema = z.object({
  email: normalizedEmailSchema,
  password: z.string().min(8),
  nome: z.string().min(2).max(100),
});

authRoutes.use('/login', rateLimit);
authRoutes.use('/register', rateLimit);
authRoutes.use('/refresh', rateLimit);

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, nome } = c.req.valid('json');
  try {
    const user = await authService.register(email, password, nome);
    return await initiate2faChallenge(c, user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return c.json({ error: message }, 400);
  }
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  try {
    const user = await authService.login(email, password);
    return await initiate2faChallenge(c, user);
  } catch (err: unknown) {
    if (err instanceof StrapiHttpError && err.path === '/auth/local' && (err.status === 400 || err.status === 401)) {
      return c.json({ error: 'Credenciais inválidas' }, 401);
    }
    return c.json({ error: 'Serviço de autenticação indisponível' }, 502);
  }
});

authRoutes.post('/logout', async (c) => {
  const refreshToken = getCookie(c, 'refresh_token');
  if (refreshToken) {
    const verified = await authService.verifyRefreshToken(refreshToken);
    if (verified) await authService.revokeRefreshToken(verified.userId, refreshToken);
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

authRoutes.get('/me', async (c) => {
  const token = getCookie(c, 'access_token');
  if (!token) return c.json(null);

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      deleteCookie(c, 'access_token');
      deleteCookie(c, 'refresh_token');
      return c.json(null);
    }
    const user = await authService.getUserById(payload.sub);
    return c.json(user);
  } catch {
    deleteCookie(c, 'access_token');
    deleteCookie(c, 'refresh_token');
    return c.json(null);
  }
});
