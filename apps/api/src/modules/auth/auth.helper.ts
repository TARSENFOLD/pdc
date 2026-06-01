import { type Context } from 'hono';
import { setCookie } from 'hono/cookie';
import type { CookieOptions } from 'hono/utils/cookie';
import type { AuthVariables } from './auth.middleware.js';
import { env } from '../../lib/env.js';

const isProd = env.NODE_ENV === 'production';
type SameSite = NonNullable<CookieOptions['sameSite']>;

const productionSameSite: SameSite = 'None';
const localSameSite: SameSite = 'Lax';

export function getAuthCookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? productionSameSite : localSameSite,
    maxAge,
    path: '/',
  };
}

export function setAuthCookies(
  c: Context<{ Variables: AuthVariables }>,
  accessToken: string,
  refreshToken: string
) {
  // Production web and API are on different sites until api.usepdc.com is active.
  // Cross-site credentialed fetch requires SameSite=None with Secure.
  setCookie(c, 'access_token', accessToken, getAuthCookieOptions(15 * 60));
  setCookie(c, 'refresh_token', refreshToken, getAuthCookieOptions(7 * 24 * 60 * 60));
}
