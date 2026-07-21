import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getCookie, deleteCookie, setCookie } from 'hono/cookie';
import { authService } from '../modules/auth/auth.service.js';
import { otpService } from '../modules/auth/otp.service.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { redis, hasPrimaryRedis } from '../lib/redis.js';
import pino from 'pino';
import { getAuthCookieOptions, setAuthCookies } from '../modules/auth/auth.helper.js';
import {
  setTrustedDeviceCookie,
  TRUSTED_DEVICE_COOKIE,
} from '../modules/auth/auth.helper.js';
import { env } from '../lib/env.js';
import { randomUUID } from 'node:crypto';
import { DomainEventName, LoginOtpVerifySchema, type User } from '@pdc/shared';
import { eventBus } from '../modules/events/event-bus.js';
import { authSessionService } from '../modules/auth/auth-session.service.js';
import { trustedDeviceService } from '../modules/auth/trusted-device.service.js';

const log = pino({ name: 'otp-routes' });
export const otpRoutes = new Hono<{ Variables: AuthVariables }>();

function requestIp(c: Context<{ Variables: AuthVariables }>): string | undefined {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || undefined;
}

async function publishLogin(c: Context<{ Variables: AuthVariables }>, userId: string): Promise<void> {
  const ip = requestIp(c);
  try {
    await eventBus.publishWithOutbox(DomainEventName.LOGIN, {
      userId,
      ...(ip ? { ip } : {}),
    });
  } catch (err) {
    log.error({ err, userId }, 'Falha ao publicar LOGIN');
  }
}

export async function initiate2faChallenge(c: Context<{ Variables: AuthVariables }>, user: User) {
  const allowOtpBypass = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';

  // E2E / dev: skip OTP entirely when DEV_SKIP_OTP=true (only in development/test)
  if (allowOtpBypass && env.DEV_SKIP_OTP === 'true') {
    log.warn({ userId: user.id }, '[DEV] OTP skipped via DEV_SKIP_OTP');
    const session = await authSessionService.issue(user);
    setAuthCookies(c, session);
    await publishLogin(c, user.id);
    return c.json(user);
  }

  const trustedDeviceToken = getCookie(c, TRUSTED_DEVICE_COOKIE);
  if (!hasPrimaryRedis) return c.json({ error: 'Autenticação temporariamente indisponível' }, 503);
  try {
    if (trustedDeviceToken && await trustedDeviceService.belongsToUser(trustedDeviceToken, user.id)) {
      const session = await authSessionService.issue(user);
      setAuthCookies(c, session);
      await publishLogin(c, user.id);
      return c.json(user);
    }
  } catch (err) {
    log.error({ err, userId: user.id }, 'Falha ao validar dispositivo confiável');
    return c.json({ error: 'Autenticação temporariamente indisponível' }, 503);
  }

  const challengeId = randomUUID();
  try {
    const stored = await redis.set(`auth_challenge:${challengeId}`, user.id, { ex: 600 });
    if (stored !== 'OK') throw new Error('Redis recusou o challenge de autenticação');
  } catch (err) {
    log.error({ err, userId: user.id }, 'Falha ao persistir challenge de autenticação');
    return c.json({ error: 'Autenticação temporariamente indisponível' }, 503);
  }
  setCookie(c, 'auth_challenge', challengeId, getAuthCookieOptions(600));
  try {
    const otp = otpService.generateOtp();
    await otpService.storeOtp(user.id, otp, 'email');
    if (env.NODE_ENV !== 'production') {
      log.info({ userId: user.id, otp }, '[DEV] OTP gerado — use este código para autenticar');
    }
    await otpService.sendOtpEmail(user.email, otp);
  } catch (err) {
    await Promise.allSettled([
      redis.del(`auth_challenge:${challengeId}`),
      otpService.deleteOtp(user.id, 'email'),
    ]);
    deleteCookie(c, 'auth_challenge', { path: '/' });
    log.error({ err, userId: user.id }, 'Failed to auto-send OTP');
    return c.json({ error: 'Falha ao enviar código de verificação' }, 502);
  }
  return c.json({ requiresOtp: true, canal: 'email' });
}

const otpSendSchema = z.object({
  canal: z.enum(['email', 'sms']),
  phone: z.string().optional(),
});

async function getChallengeUserId(c: Context<{ Variables: AuthVariables }>): Promise<string | null> {
  const challengeId = getCookie(c, 'auth_challenge');
  if (!challengeId || !hasPrimaryRedis) return null;
  return redis.get<string>(`auth_challenge:${challengeId}`);
}

otpRoutes.post('/send', zValidator('json', otpSendSchema), async (c) => {
  const userId = await getChallengeUserId(c);
  if (!userId) return c.json({ error: 'Sessão inválida' }, 401);
  const { canal, phone } = c.req.valid('json');
  if (hasPrimaryRedis) {
    const rateKey = `otp_rate:${userId}`;
    const count = await redis.incr(rateKey);
    if (count === 1) await redis.expire(rateKey, 600);
    if (count > 3) return c.json({ error: 'Muitos pedidos.' }, 429);
  }
  try {
    const otp = otpService.generateOtp();
    await otpService.storeOtp(userId, otp, canal);
    if (canal === 'email') {
      const fullUser = await authService.getUserById(userId);
      await otpService.sendOtpEmail(fullUser.email, otp);
    } else {
      if (!phone || !otpService.validateE164(phone)) return c.json({ error: 'Número inválido. Use o formato E.164 (ex: +244923456789).' }, 400);
      await otpService.sendOtpSms(phone, otp);
    }
    return c.json({ success: true, canal });
  } catch (err: unknown) {
    log.error({ err }, 'Error sending OTP');
    return c.json({ error: 'Erro ao processar OTP' }, 502);
  }
});

otpRoutes.post('/sms', verifyJwt, zValidator('json', z.object({ phone: z.string() })), async (c) => {
  const user = c.get('user');
  const { phone } = c.req.valid('json');
  if (hasPrimaryRedis) {
    const rateKey = `otp_rate:${user.id}`;
    const count = await redis.incr(rateKey);
    if (count === 1) await redis.expire(rateKey, 600);
    if (count > 3) return c.json({ error: 'Muitos pedidos.' }, 429);
  }
  try {
    if (!otpService.validateE164(phone)) return c.json({ error: 'Número inválido. Use o formato E.164 (ex: +244923456789).' }, 400);
    const otp = otpService.generateOtp();
    await otpService.storeOtp(user.id, otp, 'sms');
    await otpService.sendOtpSms(phone, otp);
    return c.json({ success: true, canal: 'sms' });
  } catch {
    return c.json({ error: 'Erro ao processar OTP SMS' }, 502);
  }
});

otpRoutes.post('/verify', zValidator('json', LoginOtpVerifySchema), async (c) => {
  const challengeId = getCookie(c, 'auth_challenge');
  if (!challengeId || !hasPrimaryRedis) return c.json({ error: 'Sessão inválida' }, 401);
  const { otp, canal, trustDevice } = c.req.valid('json');
  let userId: string | undefined;
  let issuedRefreshToken: string | undefined;
  let issuedDeviceToken: string | undefined;
  try {
    userId = await redis.get<string>(`auth_challenge:${challengeId}`) ?? undefined;
    if (!userId) return c.json({ error: 'Sessão expirada' }, 401);
    const isValid = await otpService.verifyOtp(userId, otp, canal);
    if (!isValid) return c.json({ error: 'Código inválido' }, 400);
    const user = await authService.getUserById(userId);
    if (trustDevice) {
      issuedDeviceToken = await trustedDeviceService.issue(user.id);
    }
    const session = await authSessionService.issue(user);
    issuedRefreshToken = session.refreshToken;
    const deletedChallenge = await redis.del(`auth_challenge:${challengeId}`);
    if (deletedChallenge !== 1) {
      throw new Error('Challenge de autenticação não pôde ser consumido');
    }
    deleteCookie(c, 'auth_challenge', { path: '/' });
    setAuthCookies(c, session);
    if (issuedDeviceToken) setTrustedDeviceCookie(c, issuedDeviceToken);
    await publishLogin(c, user.id);
    return c.json(user);
  } catch (err) {
    const compensations = await Promise.allSettled([
      ...(issuedRefreshToken ? [authSessionService.revoke(issuedRefreshToken)] : []),
      ...(issuedDeviceToken ? [trustedDeviceService.revoke(issuedDeviceToken)] : []),
    ]);
    for (const compensation of compensations) {
      if (compensation.status === 'rejected') {
        log.error(
          { err: compensation.reason, userId },
          'Falha ao compensar credencial após erro no OTP',
        );
      }
    }
    log.error({ err, userId }, 'Falha operacional ao concluir OTP');
    return c.json({ error: 'Autenticação temporariamente indisponível' }, 503);
  }
});
