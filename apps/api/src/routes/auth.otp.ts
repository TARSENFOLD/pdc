import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getCookie, deleteCookie, setCookie } from 'hono/cookie';
import { authService } from '../modules/auth/auth.service.js';
import { otpService } from '../modules/auth/otp.service.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { redis, hasRedis } from '../lib/redis.js';
import pino from 'pino';
import { getAuthCookieOptions, setAuthCookies } from '../modules/auth/auth.helper.js';
import { env } from '../lib/env.js';
import { randomUUID } from 'node:crypto';
import { DomainEventName, type User } from '@pdc/shared';
import { eventBus } from '../modules/events/event-bus.js';

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
    const { accessToken, refreshToken } = await authService.generateTokens(user);
    await authService.saveRefreshToken(user.id, refreshToken);
    setAuthCookies(c, accessToken, refreshToken);
    await publishLogin(c, user.id);
    return c.json(user);
  }

  const challengeId = randomUUID();
  if (hasRedis) await redis.set(`auth_challenge:${challengeId}`, user.id, { ex: 600 });
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
      hasRedis ? redis.del(`auth_challenge:${challengeId}`) : Promise.resolve(),
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

const otpVerifySchema = z.object({
  otp: z.string().length(6),
  canal: z.enum(['email', 'sms']),
});

async function getChallengeUserId(c: Context<{ Variables: AuthVariables }>): Promise<string | null> {
  const challengeId = getCookie(c, 'auth_challenge');
  if (!challengeId || !hasRedis) return null;
  return redis.get<string>(`auth_challenge:${challengeId}`);
}

otpRoutes.post('/send', zValidator('json', otpSendSchema), async (c) => {
  const userId = await getChallengeUserId(c);
  if (!userId) return c.json({ error: 'Sessão inválida' }, 401);
  const { canal, phone } = c.req.valid('json');
  if (hasRedis) {
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
    return c.json({ error: 'Erro ao processar OTP' }, 500);
  }
});

otpRoutes.post('/sms', verifyJwt, zValidator('json', z.object({ phone: z.string() })), async (c) => {
  const user = c.get('user');
  const { phone } = c.req.valid('json');
  if (hasRedis) {
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
    return c.json({ error: 'Erro ao processar OTP SMS' }, 500);
  }
});

otpRoutes.post('/verify', zValidator('json', otpVerifySchema), async (c) => {
  const challengeId = getCookie(c, 'auth_challenge');
  if (!challengeId || !hasRedis) return c.json({ error: 'Sessão inválida' }, 401);
  const userId = await redis.get<string>(`auth_challenge:${challengeId}`);
  if (!userId) return c.json({ error: 'Sessão expirada' }, 401);
  const { otp, canal } = c.req.valid('json');
  try {
    const isValid = await otpService.verifyOtp(userId, otp, canal);
    if (!isValid) return c.json({ error: 'Código inválido' }, 400);
    const user = await authService.getUserById(userId);
    const { accessToken, refreshToken } = await authService.generateTokens(user);
    await authService.saveRefreshToken(user.id, refreshToken);
    setAuthCookies(c, accessToken, refreshToken);
    deleteCookie(c, 'auth_challenge');
    await redis.del(`auth_challenge:${challengeId}`);
    await publishLogin(c, user.id);
    return c.json(user);
  } catch {
    return c.json({ error: 'Erro interno' }, 500);
  }
});
