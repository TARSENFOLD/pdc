import { type Context } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import type { CookieOptions } from 'hono/utils/cookie';
import type { AuthVariables } from './auth.middleware.js';
import { env } from '../../lib/env.js';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_COOKIE,
  TRUSTED_DEVICE_TTL_SECONDS,
} from './auth.constants.js';
import type { AuthSessionTokens } from './auth-session.service.js';

const isProd = env.NODE_ENV === 'production';
type SameSite = NonNullable<CookieOptions['sameSite']>;

const productionSameSite: SameSite = 'Strict';
const localSameSite: SameSite = 'Lax';
export const TRUSTED_DEVICE_COOKIE = 'trusted_device';

export function getAuthCookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? productionSameSite : localSameSite,
    maxAge,
    path: '/',
  };
}

export function getOAuthCookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax',
    maxAge,
    path: '/auth',
  };
}

export function setAuthCookies(
  c: Context<{ Variables: AuthVariables }>,
  session: AuthSessionTokens,
) {
  setCookie(c, ACCESS_TOKEN_COOKIE, session.accessToken, getAuthCookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS));
  setCookie(c, REFRESH_TOKEN_COOKIE, session.refreshToken, getAuthCookieOptions(session.refreshMaxAgeSeconds));
}

export function setTrustedDeviceCookie(
  c: Context<{ Variables: AuthVariables }>,
  token: string,
): void {
  setCookie(c, TRUSTED_DEVICE_COOKIE, token, getAuthCookieOptions(TRUSTED_DEVICE_TTL_SECONDS));
}

export function deleteTrustedDeviceCookie(c: Context<{ Variables: AuthVariables }>): void {
  deleteCookie(c, TRUSTED_DEVICE_COOKIE, { path: '/' });
}
