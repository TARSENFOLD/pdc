import { type Context } from 'hono';
import { setCookie } from 'hono/cookie';
import type { AuthVariables } from './auth.middleware.js';

const isProd = process.env.NODE_ENV === 'production';

export function canSkipOtp(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.DEV_SKIP_OTP === 'true' &&
    !process.env.STRAPI_URL?.includes('pdc-strapi.railway.app')
  );
}

export function setAuthCookies(
  c: Context<{ Variables: AuthVariables }>,
  accessToken: string,
  refreshToken: string
) {
  const sameSite = isProd ? 'Strict' : 'Lax';
  setCookie(c, 'access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite,
    maxAge: 15 * 60,
    path: '/',
  });
  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite,
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}
