import { type Context } from 'hono';
import { setCookie } from 'hono/cookie';
import type { AuthVariables } from './auth.middleware.js';
import { env } from '../../lib/env.js';

const isProd = env.NODE_ENV === 'production';

export function canSkipOtp(): boolean {
  return (
    env.NODE_ENV !== 'production' &&
    env.DEV_SKIP_OTP === 'true' &&
    !env.STRAPI_URL?.includes('pdc-strapi.railway.app')
  );
}

export function setAuthCookies(
  c: Context<{ Variables: AuthVariables }>,
  accessToken: string,
  refreshToken: string
) {
  // Em desenvolvimento, usamos 'Lax' mas sem 'Secure' para localhost.
  // Se o problema persistir, mudamos para 'None' com 'Secure: true'.
  const sameSite = isProd ? 'Strict' : 'Lax';
  
  setCookie(c, 'access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: sameSite as "Strict" | "Lax" | "None",
    maxAge: 15 * 60,
    path: '/',
    // Adicionar domain para evitar mismatches entre localhost e 127.0.0.1
  });
  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: sameSite as "Strict" | "Lax" | "None",
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}
