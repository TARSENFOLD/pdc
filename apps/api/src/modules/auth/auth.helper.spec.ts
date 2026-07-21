import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { AuthVariables } from './auth.middleware.js';
import { ACCESS_TOKEN_MAX_AGE_SECONDS, SESSION_TTL_SECONDS } from './auth.constants.js';

async function loadHelperWithNodeEnv(nodeEnv: string) {
  vi.resetModules();
  vi.doMock('../../lib/env.js', () => ({
    env: {
      NODE_ENV: nodeEnv,
    },
  }));

  return import('./auth.helper.js');
}

afterEach(() => {
  vi.doUnmock('../../lib/env.js');
  vi.resetModules();
});

describe('auth cookie options', () => {
  it('uses a browser-persistent absolute session window', () => {
    expect(ACCESS_TOKEN_MAX_AGE_SECONDS).toBe(15 * 60);
    expect(SESSION_TTL_SECONDS).toBe(90 * 24 * 60 * 60);
  });

  it('wires the refresh session lifetime into the emitted persistent cookie', async () => {
    const { setAuthCookies } = await loadHelperWithNodeEnv('production');
    const app = new Hono<{ Variables: AuthVariables }>();
    app.get('/', (c) => {
      setAuthCookies(c, {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        refreshMaxAgeSeconds: SESSION_TTL_SECONDS,
      });
      return c.text('ok');
    });

    const response = await app.request('/');
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(setCookie).toContain('access_token=access-token');
    expect(setCookie).toContain(`Max-Age=${String(ACCESS_TOKEN_MAX_AGE_SECONDS)}`);
    expect(setCookie).toContain('refresh_token=refresh-token');
    expect(setCookie).toContain(`Max-Age=${String(SESSION_TTL_SECONDS)}`);
  });

  it('keeps production auth cookies first-party and strict', async () => {
    const { getAuthCookieOptions, getOAuthCookieOptions } = await loadHelperWithNodeEnv('production');

    expect(getAuthCookieOptions(600)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 600,
      path: '/',
    });
    expect(getOAuthCookieOptions(600)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 600,
      path: '/auth',
    });
  });

  it('keeps local auth cookies usable without HTTPS', async () => {
    const { getAuthCookieOptions } = await loadHelperWithNodeEnv('development');

    expect(getAuthCookieOptions(600)).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      maxAge: 600,
      path: '/',
    });
  });
});
