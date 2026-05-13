import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SignJWT } from 'jose';

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

const authServiceMock = vi.hoisted(() => ({
  findOrCreateUser: vi.fn(),
  generateTokens: vi.fn(),
  saveRefreshToken: vi.fn(),
  setOauthProvider: vi.fn(),
  getUserById: vi.fn(),
}));

const setAuthCookiesMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/env.js', () => ({
  env: {
    GOOGLE_CLIENT_ID: 'google-client-id',
    GOOGLE_CLIENT_SECRET: 'google-client-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:3001/auth/google/callback',
    LINKEDIN_CLIENT_ID: 'linkedin-client-id',
    LINKEDIN_CLIENT_SECRET: 'linkedin-client-secret',
    LINKEDIN_REDIRECT_URI: 'http://localhost:3001/auth/linkedin/callback',
    OAUTH_REDIRECT_BASE_URL: 'http://localhost:5173',
    JWT_SECRET: 'test-secret-at-least-32-chars-long!!',
    API_URL: 'http://localhost:3001',
    FRONTEND_URL: 'http://localhost:5173',
    NODE_ENV: 'test',
  },
}));

vi.mock('../lib/redis.js', () => ({ redis: redisMock }));

vi.mock('../modules/auth/auth.service.js', () => ({
  authService: authServiceMock,
}));

vi.mock('../modules/auth/auth.helper.js', () => ({
  setAuthCookies: setAuthCookiesMock,
}));

vi.mock('../modules/auth/oauth-onboarding.service.js', () => ({
  oauthOnboardingService: {
    escolherRole: vi.fn(),
    verificarOtp: vi.fn(),
  },
}));

vi.mock('pino', () => ({
  default: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
}));

import { oauthRoutes } from './auth.oauth.js';
import { oauthOnboardingService } from '../modules/auth/oauth-onboarding.service.js';

const verificarOtpMock = vi.mocked(oauthOnboardingService)['verificarOtp'];

const TEST_SECRET = new TextEncoder().encode('test-secret-at-least-32-chars-long!!');

async function makeTestToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(TEST_SECRET);
}

const MOCK_USER_ONBOARDED = {
  id: 'user-42',
  email: 'user@pdc.ao',
  role: 'estudante',
  oauthVerified: true,
  onboardingCompleto: true,
};

const MOCK_USER_NEW = {
  id: 'user-43',
  email: 'new@pdc.ao',
  role: 'estudante',
  oauthVerified: undefined,
  onboardingCompleto: false,
};

const MOCK_TOKENS = { accessToken: 'at-abc', refreshToken: 'rt-xyz' };
const MOCK_TOKENS_FRESH = { accessToken: 'at-fresh', refreshToken: 'rt-fresh' };

describe('OAuth callbacks — invalid state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Google: rejects callback with unknown state and returns 400', async () => {
    redisMock.get.mockResolvedValue(null);

    const res = await oauthRoutes.request('/google/callback?code=xyz&state=unknown-state');

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid state' });
    expect(redisMock.del).not.toHaveBeenCalled();
  });

  it('LinkedIn: rejects callback with unknown state and returns 400', async () => {
    redisMock.get.mockResolvedValue(null);

    const res = await oauthRoutes.request('/linkedin/callback?code=xyz&state=unknown-state');

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid state' });
    expect(redisMock.del).not.toHaveBeenCalled();
  });
});

describe('Google OAuth happy path — onboarded user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.get.mockResolvedValue('true');
    redisMock.del.mockResolvedValue(1);
    authServiceMock.findOrCreateUser.mockResolvedValue(MOCK_USER_ONBOARDED);
    authServiceMock.generateTokens.mockResolvedValue(MOCK_TOKENS);
    authServiceMock.saveRefreshToken.mockResolvedValue(undefined);
    authServiceMock.setOauthProvider.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exchanges code for token, fetches userinfo, creates user, and redirects to /app', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'google-at' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ email: 'user@pdc.ao', name: 'Test User' }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const res = await oauthRoutes.request('/google/callback?code=auth-code&state=valid-state');

    expect(authServiceMock.findOrCreateUser).toHaveBeenCalledWith('user@pdc.ao', 'Test User');
    expect(authServiceMock.saveRefreshToken).toHaveBeenCalledWith(MOCK_USER_ONBOARDED.id, MOCK_TOKENS.refreshToken);
    expect(setAuthCookiesMock).toHaveBeenCalledWith(expect.anything(), MOCK_TOKENS.accessToken, MOCK_TOKENS.refreshToken);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:5173/app');
  });

  it('returns 400 when Google userinfo returns no email', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'google-at' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ name: 'No Email User' }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const res = await oauthRoutes.request('/google/callback?code=auth-code&state=valid-state');

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('Email') as string });
    expect(authServiceMock.findOrCreateUser).not.toHaveBeenCalled();
  });

  it('deletes the oauth state key after a valid state check', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'google-at' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ email: 'user@pdc.ao', name: 'Test User' }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await oauthRoutes.request('/google/callback?code=auth-code&state=valid-state');

    expect(redisMock.del).toHaveBeenCalledWith('oauth_state:valid-state');
  });
});

describe('Google OAuth — new user redirects to onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.get.mockResolvedValue('true');
    redisMock.del.mockResolvedValue(1);
    authServiceMock.findOrCreateUser.mockResolvedValue(MOCK_USER_NEW);
    authServiceMock.generateTokens.mockResolvedValue(MOCK_TOKENS);
    authServiceMock.saveRefreshToken.mockResolvedValue(undefined);
    authServiceMock.setOauthProvider.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects to /criar-conta/finalizar when oauthVerified is not set', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'google-at' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ email: 'new@pdc.ao', name: 'New User' }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const res = await oauthRoutes.request('/google/callback?code=auth-code&state=valid-state');

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:5173/criar-conta/finalizar?upgrade=true');
  });

  it('redirects with ?upgrade=true when onboardingCompleto is explicitly false', async () => {
    authServiceMock.findOrCreateUser.mockResolvedValue({
      ...MOCK_USER_NEW,
      onboardingCompleto: false,
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'google-at' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ email: 'new@pdc.ao', name: 'New User' }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const res = await oauthRoutes.request('/google/callback?code=auth-code&state=valid-state');

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:5173/criar-conta/finalizar?upgrade=true');
  });
});

describe('LinkedIn OAuth happy path — onboarded user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.get.mockResolvedValue('true');
    redisMock.del.mockResolvedValue(1);
    authServiceMock.findOrCreateUser.mockResolvedValue(MOCK_USER_ONBOARDED);
    authServiceMock.generateTokens.mockResolvedValue(MOCK_TOKENS);
    authServiceMock.saveRefreshToken.mockResolvedValue(undefined);
    authServiceMock.setOauthProvider.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exchanges code for token, fetches userinfo, creates user, and redirects to /app', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'linkedin-at' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ email: 'user@pdc.ao', name: 'LinkedIn User' }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const res = await oauthRoutes.request('/linkedin/callback?code=auth-code&state=valid-state');

    expect(authServiceMock.findOrCreateUser).toHaveBeenCalledWith('user@pdc.ao', 'LinkedIn User');
    expect(authServiceMock.saveRefreshToken).toHaveBeenCalledWith(MOCK_USER_ONBOARDED.id, MOCK_TOKENS.refreshToken);
    expect(setAuthCookiesMock).toHaveBeenCalledWith(expect.anything(), MOCK_TOKENS.accessToken, MOCK_TOKENS.refreshToken);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:5173/app');
  });

  it('returns 400 when LinkedIn userinfo returns no email', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'linkedin-at' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ name: 'No Email' }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const res = await oauthRoutes.request('/linkedin/callback?code=auth-code&state=valid-state');

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('Email') as string });
  });
});

describe('POST /finalizar/verificar-otp — role upgrade after OTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verificarOtpMock.mockResolvedValue(undefined);
    authServiceMock.saveRefreshToken.mockResolvedValue(undefined);
  });

  it('mints fresh tokens with mentor role after OTP verification', async () => {
    const provisionalToken = await makeTestToken({
      sub: 'user-42',
      role: 'estudante',
      onboardingCompleto: false,
    });
    const mentorUser = {
      id: 'user-42',
      email: 'mentor@pdc.ao',
      role: 'mentor',
      oauthVerified: true,
      onboardingCompleto: true,
    };
    authServiceMock.getUserById.mockResolvedValue(mentorUser);
    authServiceMock.generateTokens.mockResolvedValue(MOCK_TOKENS_FRESH);

    const res = await oauthRoutes.request('/finalizar/verificar-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${provisionalToken}`,
      },
      body: JSON.stringify({ otp: '123456' }),
    });

    expect(res.status).toBe(200);
    expect(verificarOtpMock).toHaveBeenCalledWith('user-42', '123456');
    expect(authServiceMock.getUserById).toHaveBeenCalledWith('user-42');
    expect(authServiceMock.generateTokens).toHaveBeenCalledWith(mentorUser);
    expect(authServiceMock.saveRefreshToken).toHaveBeenCalledWith('user-42', MOCK_TOKENS_FRESH.refreshToken);
    expect(setAuthCookiesMock).toHaveBeenCalledWith(
      expect.anything(),
      MOCK_TOKENS_FRESH.accessToken,
      MOCK_TOKENS_FRESH.refreshToken,
    );
    const body = await res.json() as typeof mentorUser;
    expect(body.role).toBe('mentor');
    expect(body.onboardingCompleto).toBe(true);
  });

  it('mints fresh tokens with instituicao role after OTP verification', async () => {
    const provisionalToken = await makeTestToken({
      sub: 'user-55',
      role: 'estudante',
      onboardingCompleto: false,
    });
    const instituicaoUser = {
      id: 'user-55',
      email: 'inst@pdc.ao',
      role: 'instituicao',
      oauthVerified: true,
      onboardingCompleto: true,
    };
    authServiceMock.getUserById.mockResolvedValue(instituicaoUser);
    authServiceMock.generateTokens.mockResolvedValue(MOCK_TOKENS_FRESH);

    const res = await oauthRoutes.request('/finalizar/verificar-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${provisionalToken}`,
      },
      body: JSON.stringify({ otp: '654321' }),
    });

    expect(res.status).toBe(200);
    expect(authServiceMock.generateTokens).toHaveBeenCalledWith(instituicaoUser);
    expect(setAuthCookiesMock).toHaveBeenCalledWith(
      expect.anything(),
      MOCK_TOKENS_FRESH.accessToken,
      MOCK_TOKENS_FRESH.refreshToken,
    );
    const body = await res.json() as typeof instituicaoUser;
    expect(body.role).toBe('instituicao');
  });

  it('returns 400 when OTP is invalid', async () => {
    const provisionalToken = await makeTestToken({
      sub: 'user-42',
      role: 'estudante',
      onboardingCompleto: false,
    });
    verificarOtpMock.mockRejectedValue(
      Object.assign(new Error('Código inválido ou expirado'), { status: 400 })
    );

    const res = await oauthRoutes.request('/finalizar/verificar-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${provisionalToken}`,
      },
      body: JSON.stringify({ otp: '000000' }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'Código inválido ou expirado' });
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
  });
});
