import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getCookie, deleteCookie, setCookie } from 'hono/cookie';
import { authService } from '../modules/auth/auth.service.js';
import { otpService } from '../modules/auth/otp.service.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { redis, hasRedis } from '../lib/redis.js';
import pino from 'pino';
import { setAuthCookies, canSkipOtp } from '../modules/auth/auth.helper.js';
import { randomUUID } from 'node:crypto';
import type { User } from '@pdc/shared';

const log = pino({ name: 'otp-routes' });
export const otpRoutes = new Hono<{ Variables: AuthVariables }>();

export async function initiate2faChallenge(c: Context<{ Variables: AuthVariables }>, user: User) {
  if (canSkipOtp()) {
    log.warn({ userId: user.id }, 'OTP bypassed in dev mode');
    const { accessToken, refreshToken } = await authService.generateTokens(user);
    await authService.saveRefreshToken(user.id, refreshToken);
    setAuthCookies(c, accessToken, refreshToken);
    return c.json(user);
  }
  const challengeId = randomUUID();
  if (hasRedis) await redis.set(`auth_challenge:${challengeId}`, user.id, { ex: 600 });
  setCookie(c, 'auth_challenge', challengeId, { httpOnly: true, secure: false, sameSite: 'Strict', maxAge: 600, path: '/' });
  try {
    const otp = otpService.generateOtp();
    await otpService.storeOtp(user.id, otp, 'email');
    await otpService.sendOtpEmail(user.email, otp);
  } catch (err) {
    log.error({ err }, 'Failed to auto-send OTP');
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
      if (!phone || !phone.startsWith('+244')) return c.json({ error: 'Número inválido' }, 400);
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
    if (!phone.startsWith('+244')) return c.json({ error: 'Número inválido' }, 400);
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
    return c.json(user);
  } catch {
    return c.json({ error: 'Erro interno' }, 500);
  }
});
