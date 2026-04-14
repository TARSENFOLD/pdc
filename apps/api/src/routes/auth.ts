import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { deleteCookie, getCookie } from 'hono/cookie';
import { authService } from '../modules/auth/auth.service.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { rateLimit, rateLimitRegisto } from '../middleware/rateLimit.js';
import {
  RegistoEstudantePayloadSchema,
  RegistoMentorPayloadSchema,
  RegistoInstituicaoPayloadSchema,
} from '@pdc/shared';
import { setAuthCookies } from '../modules/auth/auth.helper.js';
import { initiate2faChallenge } from './auth.otp.js';
import { otpRoutes } from './auth.otp.js';
import { oauthRoutes } from './auth.oauth.js';

export const authRoutes = new Hono<{ Variables: AuthVariables }>();

// Montar sub-routers
authRoutes.route('/otp', otpRoutes);
authRoutes.route('/', oauthRoutes);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  email: z.string().email(),
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
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return c.json({ error: message }, 401);
  }
});

authRoutes.post('/logout', verifyJwt, async (c) => {
  const user = c.get('user');
  const refreshToken = getCookie(c, 'refresh_token');
  if (refreshToken) await authService.revokeRefreshToken(user.id, refreshToken);
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

authRoutes.use('/register/estudante', rateLimitRegisto);
authRoutes.use('/register/mentor', rateLimitRegisto);
authRoutes.use('/register/instituicao', rateLimitRegisto);

authRoutes.post('/register/estudante', zValidator('json', RegistoEstudantePayloadSchema), async (c) => {
  const { email, password, nome, areaInteresse, nivelEnsino } = c.req.valid('json');
  try {
    const user = await authService.registerWithRole(email, password, nome, 'aluno', { 
      areasInteresse: [areaInteresse], 
      nivelEnsino 
    });
    return await initiate2faChallenge(c, user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return c.json({ error: message }, 400);
  }
});

authRoutes.post('/register/mentor', zValidator('json', RegistoMentorPayloadSchema), async (c) => {
  const { email, password, nome, areaEspecialidade, documentos } = c.req.valid('json');
  try {
    const user = await authService.registerWithRole(email, password, nome, 'mentor', { 
      areaFormacao: areaEspecialidade, 
      documentos: documentos ?? [], 
      aprovado: false 
    });
    return await initiate2faChallenge(c, user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return c.json({ error: message }, 400);
  }
});

authRoutes.post('/register/instituicao', zValidator('json', RegistoInstituicaoPayloadSchema), async (c) => {
  const { nomeInstituicao, email, password, regiao, tipo, documentos } = c.req.valid('json');
  try {
    const user = await authService.registerWithRole(email, password, nomeInstituicao, 'instituicao', { 
      regiao, 
      tipoInstituicao: tipo, 
      documentos: documentos ?? [], 
      aprovado: false 
    });
    return await initiate2faChallenge(c, user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return c.json({ error: message }, 400);
  }
});
