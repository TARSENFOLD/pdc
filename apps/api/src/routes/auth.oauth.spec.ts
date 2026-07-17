import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SignJWT } from 'jose';
import { createHmac } from 'node:crypto';

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

vi.mock('../lib/redis.js', () => ({ hasRedis: true, redis: redisMock }));

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

const escolherRoleMock = vi.mocked(oauthOnboardingService)['escolherRole'];
const verificarOtpMock = vi.mocked(oauthOnboardingService)['verificarOtp'];

const TEST_SECRET = new TextEncoder().encode('test-secret-at-least-32-chars-long!!');
const TEST_SECRET_RAW = 'test-secret-at-least-32-chars-long!!';

async function makeTestToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(TEST_SECRET);
}

function makeOAuthState(overrides: { issuedAt?: number; nonce?: string } = {}): string {
  const nonce = overrides.nonce ?? 'test-nonce';
  const issuedAt = (overrides.issuedAt ?? Math.floor(Date.now() / 1000)).toString();
  const payload = `${nonce}.${issuedAt}`;
  const signature = createHmac('sha256', TEST_SECRET_RAW).update(payload).digest('base64url');
  return `v1.${payload}.${signature}`;
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

    const state = makeOAuthState();
    const res = await oauthRoutes.request(`/google/callback?code=auth-code&state=${encodeURIComponent(state)}`);

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

    const state = makeOAuthState();
    const res = await oauthRoutes.request(`/google/callback?code=auth-code&state=${encodeURIComponent(state)}`);

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

    const state = makeOAuthState();
    await oauthRoutes.request(`/google/callback?code=auth-code&state=${encodeURIComponent(state)}`);

    expect(redisMock.del).toHaveBeenCalledWith(`oauth_state:${state}`);
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

    const state = makeOAuthState();
    const res = await oauthRoutes.request(`/google/callback?code=auth-code&state=${encodeURIComponent(state)}`);

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

    const state = makeOAuthState();
    const res = await oauthRoutes.request(`/google/callback?code=auth-code&state=${encodeURIComponent(state)}`);

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

    const state = makeOAuthState();
    const res = await oauthRoutes.request(`/linkedin/callback?code=auth-code&state=${encodeURIComponent(state)}`);

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

    const state = makeOAuthState();
    const res = await oauthRoutes.request(`/linkedin/callback?code=auth-code&state=${encodeURIComponent(state)}`);

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('Email') as string });
  });

  it('redirects to login with a controlled error when persistence is unavailable', async () => {
    authServiceMock.findOrCreateUser.mockRejectedValue(new Error('Strapi timeout'));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'linkedin-at' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ email: 'user@pdc.ao', name: 'LinkedIn User' }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const state = makeOAuthState();
    const res = await oauthRoutes.request(`/linkedin/callback?code=auth-code&state=${encodeURIComponent(state)}`);

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:5173/login?error=oauth_unavailable');
  });
});

describe('POST /finalizar/escolher-role — OAuth role finalization without OTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    escolherRoleMock.mockResolvedValue(undefined);
    authServiceMock.saveRefreshToken.mockResolvedValue(undefined);
  });

  it('mints fresh tokens immediately after choosing mentor role', async () => {
    const aceiteLegal = {
      termosUso: true,
      politicaPrivacidade: true,
      tratamentoDados: true,
      termosUsoVersao: 'termos-uso@2026-06-22',
      politicaPrivacidadeVersao: 'politica-privacidade@2026-06-22',
      tratamentoDadosVersao: 'tratamento-dados@2026-06-22',
      aceiteEm: '2026-06-22T10:00:00.000Z',
    };
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

    const res = await oauthRoutes.request('/finalizar/escolher-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${provisionalToken}`,
      },
      body: JSON.stringify({
        role: 'mentor',
        dataNascimento: '1990-01-01',
        aceiteLegal,
        areaEspecialidade: 'TECNOLOGIA',
        documentos: [{ tipo: 'comprovativo', url: 'https://www.usepdc.com/docs/mentor.pdf' }],
      }),
    });

    expect(res.status).toBe(200);
    expect(escolherRoleMock).toHaveBeenCalledWith('user-42', {
      role: 'mentor',
      dataNascimento: '1990-01-01',
      aceiteLegal,
      areaEspecialidade: 'TECNOLOGIA',
      documentos: [{ tipo: 'comprovativo', url: 'https://www.usepdc.com/docs/mentor.pdf' }],
    });
    expect(verificarOtpMock).not.toHaveBeenCalled();
    expect(authServiceMock.getUserById).toHaveBeenCalledWith('user-42');
    expect(authServiceMock.generateTokens).toHaveBeenCalledWith(mentorUser);
    expect(authServiceMock.saveRefreshToken).toHaveBeenCalledWith('user-42', MOCK_TOKENS_FRESH.refreshToken);
    expect(setAuthCookiesMock).toHaveBeenCalledWith(
      expect.anything(),
      MOCK_TOKENS_FRESH.accessToken,
      MOCK_TOKENS_FRESH.refreshToken,
    );
    const body = await res.json() as typeof mentorUser;
    expect(body.onboardingCompleto).toBe(true);
  });
});

describe('POST /finalizar/verificar-otp — legacy role upgrade after OTP', () => {
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

describe('OAuth initiation - resiliencia Redis e credenciais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.set.mockResolvedValue('OK');
    redisMock.get.mockResolvedValue(null);
    redisMock.del.mockResolvedValue(undefined);
  });

  it('LinkedIn: redireciona para o consentimento da LinkedIn (happy path)', async () => {
    const res = await oauthRoutes.request('/linkedin');

    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('https://www.linkedin.com/oauth/v2/authorization');
    expect(location).toContain('client_id=linkedin-client-id');
    expect(redisMock.set).toHaveBeenCalledTimes(1);
  });

  it('LinkedIn: degrada graceful quando redis.set falha - nao devolve 500', async () => {
    redisMock.set.mockReset();
    redisMock.set.mockRejectedValueOnce(new Error('Upstash quota exceeded'));

    const res = await oauthRoutes.request('/linkedin');

    expect(res.status).toBe(302);
    expect((res.headers.get('location') ?? '')).toContain('https://www.linkedin.com/oauth/v2/authorization');
  });

  it('Google: degrada graceful quando redis.set falha - nao devolve 500', async () => {
    redisMock.set.mockReset();
    redisMock.set.mockRejectedValueOnce(new Error('Upstash quota exceeded'));

    const res = await oauthRoutes.request('/google');

    expect(res.status).toBe(302);
    expect((res.headers.get('location') ?? '')).toContain('https://accounts.google.com/o/oauth2/v2/auth');
  });

  it('LinkedIn: redireciona para /login?error=oauth_unavailable quando credenciais em falta - nao devolve 500', async () => {
    const { env } = await import('../lib/env.js');
    const savedId: string | undefined = env.LINKEDIN_CLIENT_ID;
    const savedSecret: string | undefined = env.LINKEDIN_CLIENT_SECRET;
    delete env.LINKEDIN_CLIENT_ID;
    delete env.LINKEDIN_CLIENT_SECRET;
    try {
      const res = await oauthRoutes.request('/linkedin');

      expect(res.status).toBe(302);
      const location = res.headers.get('location') ?? '';
      expect(location).toContain('/login');
      expect(location).toContain('error=oauth_unavailable');
    } finally {
      if (typeof savedId === 'string') env.LINKEDIN_CLIENT_ID = savedId;
      if (typeof savedSecret === 'string') env.LINKEDIN_CLIENT_SECRET = savedSecret;
    }
  });
});

describe('OAuth callback - resiliencia Redis em consumeOAuthState (nao 500)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authServiceMock.findOrCreateUser.mockResolvedValue(MOCK_USER_ONBOARDED);
    authServiceMock.generateTokens.mockResolvedValue(MOCK_TOKENS);
    authServiceMock.saveRefreshToken.mockResolvedValue(undefined);
    authServiceMock.setOauthProvider.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('LinkedIn: callback prossegue (302 para /app) quando redis.get falha - nao 500', async () => {
    redisMock.get.mockReset();
    redisMock.get.mockRejectedValueOnce(new Error('Upstash quota exceeded'));
    redisMock.del.mockResolvedValue(1);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'linkedin-at' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ email: 'user@pdc.ao', name: 'LinkedIn User' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const state = makeOAuthState();
    const res = await oauthRoutes.request(`/linkedin/callback?code=auth-code&state=${encodeURIComponent(state)}`);

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:5173/app');
    expect(authServiceMock.findOrCreateUser).toHaveBeenCalledWith('user@pdc.ao', 'LinkedIn User');
  });

  it('LinkedIn: callback prossegue (302 para /app) quando redis.del falha - nao 500', async () => {
    redisMock.get.mockReset();
    redisMock.get.mockResolvedValue('true');
    redisMock.del.mockReset();
    redisMock.del.mockRejectedValueOnce(new Error('Upstash quota exceeded'));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'linkedin-at' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ email: 'user@pdc.ao', name: 'LinkedIn User' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const state = makeOAuthState();
    const res = await oauthRoutes.request(`/linkedin/callback?code=auth-code&state=${encodeURIComponent(state)}`);

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:5173/app');
  });
});
