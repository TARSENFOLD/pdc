import { afterEach, describe, expect, it, vi } from 'vitest';

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
  it('allows credentialed cross-site auth requests in production', async () => {
    const { getAuthCookieOptions } = await loadHelperWithNodeEnv('production');

    expect(getAuthCookieOptions(600)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 600,
      path: '/',
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
