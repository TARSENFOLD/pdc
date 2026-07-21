import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { deleteCookie, getCookie } from 'hono/cookie';
import { authService } from '../modules/auth/auth.service.js';
import { verifyAccessJwt, verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { StrapiHttpError } from '../modules/strapi/strapi.client.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  deleteTrustedDeviceCookie,
  setAuthCookies,
  TRUSTED_DEVICE_COOKIE,
} from '../modules/auth/auth.helper.js';
import { authSessionService } from '../modules/auth/auth-session.service.js';
import { trustedDeviceService } from '../modules/auth/trusted-device.service.js';
import { initiate2faChallenge } from './auth.otp.js';
import { otpRoutes } from './auth.otp.js';
import { oauthRoutes } from './auth.oauth.js';
import { getRegisterErrorDetails, registerRoutes } from './auth.register.js';
import { passwordResetService } from '../modules/auth/password-reset.service.js';
import { DomainEventName, LegalComplianceCompletionSchema, RegistoEstudantePayloadSchema } from '@pdc/shared';
import { authComplianceService } from '../modules/auth/auth-compliance.service.js';
import { eventBus } from '../modules/events/event-bus.js';
import pino from 'pino';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../modules/auth/auth.constants.js';
import { RefreshTokenReuseError } from '../modules/auth/auth-session.errors.js';
import { AuthDomainError } from '../modules/auth/auth.errors.js';

export const authRoutes = new Hono<{ Variables: AuthVariables }>();
const log = pino({ name: 'auth-routes' });

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

const forgotPasswordSchema = z.object({
  email: normalizedEmailSchema,
});

const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(12).max(128),
});

authRoutes.use('/login', rateLimit);
authRoutes.use('/register', rateLimit);
authRoutes.use('/refresh', rateLimit);
authRoutes.use('/forgot-password', rateLimit);
authRoutes.use('/reset-password', rateLimit);

authRoutes.post('/register', zValidator('json', RegistoEstudantePayloadSchema), async (c) => {
  const {
    email,
    password,
    nome,
    areaInteresse,
    nivelEnsino,
    dataNascimento,
    consentimentoEncarregado,
    aceiteLegal,
  } = c.req.valid('json');
  try {
    const user = await authService.registerWithRole(email, password, nome, 'estudante', {
      ...(areaInteresse !== undefined ? { areasInteresse: [areaInteresse] } : {}),
      ...(nivelEnsino !== undefined ? { nivelEnsino } : {}),
    }, {
      aceiteLegal,
      dataNascimento,
      ...(consentimentoEncarregado !== undefined ? { consentimentoEncarregado } : {}),
      source: 'registo_email',
    });
    return await initiate2faChallenge(c, user);
  } catch (err: unknown) {
    const { status, message } = getRegisterErrorDetails(err);
    return c.json({ error: message }, status);
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

authRoutes.post('/compliance/legal', verifyJwt, zValidator('json', LegalComplianceCompletionSchema), async (c) => {
  const user = c.get('user');
  const payload = c.req.valid('json');
  const currentRefreshToken = getCookie(c, REFRESH_TOKEN_COOKIE);
  if (!currentRefreshToken) return c.json({ error: 'Sessão expirada' }, 401);
  try {
    await authComplianceService.completeLegalCompliance(user.id, user.role, payload);
    const updatedUser = await authService.getUserById(user.id);
    const session = await authSessionService.rotate(currentRefreshToken, updatedUser);
    if (!session) return c.json({ error: 'Sessão expirada' }, 401);
    setAuthCookies(c, session);
    return c.json(updatedUser);
  } catch (err: unknown) {
    if (err instanceof RefreshTokenReuseError) {
      deleteCookie(c, ACCESS_TOKEN_COOKIE, { path: '/' });
      deleteCookie(c, REFRESH_TOKEN_COOKIE, { path: '/' });
      return c.json({ error: 'Sessão expirada' }, 401);
    }
    if (err instanceof AuthDomainError && (err.status === 400 || err.status === 404)) {
      return c.json({ error: err.message }, err.status);
    }
    log.error({ err, userId: user.id }, 'Falha operacional ao regularizar conta');
    return c.json({ error: 'Não foi possível regularizar a conta' }, 502);
  }
});

authRoutes.post('/forgot-password', zValidator('json', forgotPasswordSchema), async (c) => {
  const { email } = c.req.valid('json');
  try {
    await passwordResetService.request(email);
  } catch {
    return c.json({ error: 'Não foi possível enviar o email de recuperação' }, 502);
  }
  return c.json({
    success: true,
    message: 'Se existir uma conta associada a este email, receberás instruções em breve.',
  });
});

authRoutes.post('/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
  const { token, password } = c.req.valid('json');
  try {
    const reset = await passwordResetService.reset(token, password);
    if (!reset) return c.json({ error: 'Link inválido ou expirado' }, 400);
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Não foi possível alterar a palavra-passe' }, 502);
  }
});

authRoutes.post('/logout', async (c) => {
  const refreshToken = getCookie(c, REFRESH_TOKEN_COOKIE);
  let revocationFailed = false;
  try {
    if (refreshToken) {
      const userId = await authSessionService.revoke(refreshToken);
      if (userId) {
        try {
          await eventBus.publishWithOutbox(DomainEventName.LOGOUT, { userId });
        } catch (err) {
          log.error({ err, userId }, 'Falha ao publicar LOGOUT após revogação');
        }
      }
    }
  } catch (err) {
    revocationFailed = true;
    log.error({ err }, 'Falha ao revogar sessão durante logout');
  }
  deleteCookie(c, ACCESS_TOKEN_COOKIE, { path: '/' });
  deleteCookie(c, REFRESH_TOKEN_COOKIE, { path: '/' });
  return revocationFailed
    ? c.json({ error: 'Não foi possível confirmar a revogação da sessão' }, 503)
    : c.json({ success: true });
});

authRoutes.post('/refresh', async (c) => {
  const oldRefreshToken = getCookie(c, REFRESH_TOKEN_COOKIE);
  if (!oldRefreshToken) return c.json({ error: 'No refresh token' }, 401);
  let userId: string | undefined;
  try {
    const verified = await authSessionService.verify(oldRefreshToken);
    if (!verified) {
      deleteCookie(c, ACCESS_TOKEN_COOKIE, { path: '/' });
      deleteCookie(c, REFRESH_TOKEN_COOKIE, { path: '/' });
      return c.json({ error: 'Invalid refresh token' }, 401);
    }
    userId = verified.userId;
    const user = await authService.getUserById(userId);
    const session = await authSessionService.rotate(oldRefreshToken, user);
    if (!session) {
      deleteCookie(c, ACCESS_TOKEN_COOKIE, { path: '/' });
      deleteCookie(c, REFRESH_TOKEN_COOKIE, { path: '/' });
      return c.json({ error: 'Invalid refresh token' }, 401);
    }
    setAuthCookies(c, session);
    return c.json({ success: true });
  } catch (err) {
    if (err instanceof RefreshTokenReuseError) {
      deleteCookie(c, ACCESS_TOKEN_COOKIE, { path: '/' });
      deleteCookie(c, REFRESH_TOKEN_COOKIE, { path: '/' });
      return c.json({ error: 'Invalid refresh token' }, 401);
    }
    log.error({ err, userId }, 'Falha operacional ao renovar sessão');
    return c.json({ error: 'Serviço de sessão temporariamente indisponível' }, 503);
  }
});

authRoutes.delete('/trusted-device', async (c) => {
  const token = getCookie(c, TRUSTED_DEVICE_COOKIE);
  let revocationFailed = false;
  try {
    if (token) await trustedDeviceService.revoke(token);
  } catch (err) {
    revocationFailed = true;
    log.error({ err }, 'Falha ao revogar dispositivo confiável');
  } finally {
    deleteTrustedDeviceCookie(c);
  }
  return revocationFailed
    ? c.json({ error: 'Não foi possível confirmar a revogação do dispositivo' }, 503)
    : c.json({ success: true });
});

authRoutes.get('/me', async (c) => {
  const token = getCookie(c, ACCESS_TOKEN_COOKIE);
  if (!token) return c.json(null);

  let payload: Awaited<ReturnType<typeof verifyAccessJwt>>;
  try {
    payload = await verifyAccessJwt(token);
  } catch (err) {
    log.error({ err }, 'Falha operacional ao validar sessão');
    return c.json({ error: 'Serviço de sessão temporariamente indisponível' }, 503);
  }
  if (!payload) {
    deleteCookie(c, ACCESS_TOKEN_COOKIE, { path: '/' });
    return c.json(null);
  }
  const userId = payload.sub;

  try {
    const user = await authService.getUserById(userId);
    return c.json(user);
  } catch (err) {
    log.error({ err, userId }, 'Falha operacional ao recuperar sessão');
    return c.json({ error: 'Serviço de autenticação temporariamente indisponível' }, 502);
  }
});
