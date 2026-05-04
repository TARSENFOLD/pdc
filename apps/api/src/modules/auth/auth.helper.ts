import { type Context } from 'hono';
import { setCookie } from 'hono/cookie';
import type { AuthVariables } from './auth.middleware.js';
import { env } from '../../lib/env.js';

const isProd = env.NODE_ENV === 'production';

export function setAuthCookies(
  c: Context<{ Variables: AuthVariables }>,
  accessToken: string,
  refreshToken: string
) {
  // Em desenvolvimento, usamos 'Lax' mas sem 'Secure' para localhost.
  // Se o problema persistir, mudamos para 'None' com 'Secure: true'.
  const sameSite: 'Strict' | 'Lax' = isProd ? 'Strict' : 'Lax';
  
  setCookie(c, 'access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite,
    maxAge: 15 * 60,
    path: '/',
    // Adicionar domain para evitar mismatches entre localhost e 127.0.0.1
  });
  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite,
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}
