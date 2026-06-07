import { type Context } from 'hono';
import { setCookie } from 'hono/cookie';
import type { CookieOptions } from 'hono/utils/cookie';
import type { AuthVariables } from './auth.middleware.js';
import { env } from '../../lib/env.js';
import {
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
} from './auth.constants.js';

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
  setCookie(c, 'access_token', accessToken, getAuthCookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS));
  setCookie(c, 'refresh_token', refreshToken, getAuthCookieOptions(REFRESH_TOKEN_MAX_AGE_SECONDS));
}
