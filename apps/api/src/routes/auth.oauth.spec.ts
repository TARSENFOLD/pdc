import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SignJWT } from 'jose';
import { createHmac } from 'node:crypto';
import { z } from 'zod';

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  eval: vi.fn(),
}));

const authServiceMock = vi.hoisted(() => ({
  findOrCreateUser: vi.fn(),
  setOauthProvider: vi.fn(),
  getUserById: vi.fn(),
}));

const authSessionServiceMock = vi.hoisted(() => ({
  issue: vi.fn(),
  rotate: vi.fn(),
  isAccessTokenCurrent: vi.fn().mockResolvedValue(true),
}));

const setAuthCookiesMock = vi.hoisted(() => vi.fn());
const featureFlagServiceMock = vi.hoisted(() => ({
  isEnabled: vi.fn().mockResolvedValue(true),
}));

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

vi.mock('../lib/redis.js', () => ({ hasPrimaryRedis: true, redis: redisMock }));

vi.mock('../modules/auth/auth.service.js', () => ({
  authService: authServiceMock,
}));

vi.mock('../modules/auth/auth.helper.js', () => ({
  setAuthCookies: setAuthCookiesMock,
  getOAuthCookieOptions: vi.fn(() => ({ path: '/auth', httpOnly: true, sameSite: 'Lax' })),
}));

vi.mock('../modules/auth/auth-session.service.js', () => ({
  authSessionService: authSessionServiceMock,
}));

vi.mock('../modules/auth/oauth-onboarding.service.js', () => ({
  oauthOnboardingService: {
    escolherRole: vi.fn(),
    verificarOtp: vi.fn(),
  },
}));

vi.mock('../modules/feature-flags/feature-flags.service.js', () => ({
  featureFlagService: featureFlagServiceMock,
}));

vi.mock('pino', () => ({
  default: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
}));

import { oauthRoutes } from './auth.oauth.js';
import { oauthOnboardingService } from '../modules/auth/oauth-onboarding.service.js';
import { AuthDomainError } from '../modules/auth/auth.errors.js';

const escolherRoleMock = vi.mocked(oauthOnboardingService)['escolherRole'];
const verificarOtpMock = vi.mocked(oauthOnboardingService)['verificarOtp'];

const TEST_SECRET = new TextEncoder().encode('test-secret-at-least-32-chars-long!!');
const TEST_SECRET_RAW = 'test-secret-at-least-32-chars-long!!';

async function makeTestToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'access' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(TEST_SECRET);
}

function makeOAuthState(overrides: { issuedAt?: number; nonce?: string } = {}): string {
  const nonce = overrides.nonce ?? 'test-nonce';
  const issuedAt = (overrides.issuedAt ?? Math.floor(Date.now() / 1000)).toString();
  const payload = `${nonce}.${issuedAt}`;
  const stateSecret = createHmac('sha256', TEST_SECRET_RAW)
    .update('pdc/oauth-state/v2')
    .digest();
  const signature = createHmac('sha256', stateSecret).update(payload).digest('base64url');
  return `v2.${payload}.${signature}`;
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

const MOCK_TOKENS = { accessToken: 'at-abc', refreshToken: 'rt-xyz', refreshMaxAgeSeconds: 7_776_000 };
const MOCK_TOKENS_FRESH = { accessToken: 'at-fresh', refreshToken: 'rt-fresh', refreshMaxAgeSeconds: 7_775_000 };

async function callbackRequest(path: string, state: string): Promise<Response> {
  return await oauthRoutes.request(`${path}?code=auth-code&state=${encodeURIComponent(state)}`, {
    headers: { Cookie: `oauth_state=${state}` },
  });
}

describe('OAuth callbacks — invalid state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.eval.mockResolvedValue(1);
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
    redisMock.eval.mockResolvedValue(1);
    authServiceMock.findOrCreateUser.mockResolvedValue(MOCK_USER_ONBOARDED);
    authSessionServiceMock.issue.mockResolvedValue(MOCK_TOKENS);
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
    const res = await callbackRequest('/google/callback', state);

    expect(authServiceMock.findOrCreateUser).toHaveBeenCalledWith('user@pdc.ao', 'Test User');
    expect(authSessionServiceMock.issue).toHaveBeenCalledWith(MOCK_USER_ONBOARDED);
    expect(setAuthCookiesMock).toHaveBeenCalledWith(expect.anything(), MOCK_TOKENS);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://oauth2.googleapis.com/token');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://www.googleapis.com/oauth2/v3/userinfo');
    z.object({ signal: z.instanceof(AbortSignal) }).parse(fetchMock.mock.calls[0]?.[1]);
    z.object({ signal: z.instanceof(AbortSignal) }).parse(fetchMock.mock.calls[1]?.[1]);
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
    const res = await callbackRequest('/google/callback', state);

    expect(res.status).toBe(400);
    expect(await res.text()).toContain('Email');
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
    await callbackRequest('/google/callback', state);

    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("DEL"'),
      [`oauth_state:${state}`],
      [],
    );
  });
});

describe('Google OAuth — new user redirects to onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.eval.mockResolvedValue(1);
    authServiceMock.findOrCreateUser.mockResolvedValue(MOCK_USER_NEW);
    authSessionServiceMock.issue.mockResolvedValue(MOCK_TOKENS);
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
    const res = await callbackRequest('/google/callback', state);

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
    const res = await callbackRequest('/google/callback', state);

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:5173/criar-conta/finalizar?upgrade=true');
  });
});

describe('LinkedIn OAuth happy path — onboarded user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.eval.mockResolvedValue(1);
    authServiceMock.findOrCreateUser.mockResolvedValue(MOCK_USER_ONBOARDED);
    authSessionServiceMock.issue.mockResolvedValue(MOCK_TOKENS);
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
    const res = await callbackRequest('/linkedin/callback', state);

    expect(authServiceMock.findOrCreateUser).toHaveBeenCalledWith('user@pdc.ao', 'LinkedIn User');
    expect(authSessionServiceMock.issue).toHaveBeenCalledWith(MOCK_USER_ONBOARDED);
    expect(setAuthCookiesMock).toHaveBeenCalledWith(expect.anything(), MOCK_TOKENS);
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
    const res = await callbackRequest('/linkedin/callback', state);

    expect(res.status).toBe(400);
    expect(await res.text()).toContain('Email');
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
    const res = await callbackRequest('/linkedin/callback', state);

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:5173/login?error=oauth_unavailable');
  });
});

describe('POST /finalizar/escolher-role — OAuth role finalization without OTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlagServiceMock.isEnabled.mockResolvedValue(true);
    escolherRoleMock.mockResolvedValue(undefined);
    authSessionServiceMock.rotate.mockResolvedValue(MOCK_TOKENS_FRESH);
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

    const res = await oauthRoutes.request('/finalizar/escolher-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${provisionalToken}; refresh_token=current-refresh`,
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
    expect(authSessionServiceMock.rotate).toHaveBeenCalledWith('current-refresh', mentorUser);
    expect(setAuthCookiesMock).toHaveBeenCalledWith(expect.anything(), MOCK_TOKENS_FRESH);
    expect(await res.json()).toMatchObject({ onboardingCompleto: true });
  });

  it('não provisiona mentor por OAuth com onboarding externo desligado', async () => {
    featureFlagServiceMock.isEnabled.mockResolvedValue(false);
    const provisionalToken = await makeTestToken({
      sub: 'user-42',
      role: 'estudante',
      onboardingCompleto: false,
    });

    const res = await oauthRoutes.request('/finalizar/escolher-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${provisionalToken}; refresh_token=current-refresh`,
      },
      body: JSON.stringify({
        role: 'mentor',
        dataNascimento: '1990-01-01',
        aceiteLegal: {
          termosUso: true,
          politicaPrivacidade: true,
          tratamentoDados: true,
          termosUsoVersao: 'termos-uso@2026-06-22',
          politicaPrivacidadeVersao: 'politica-privacidade@2026-06-22',
          tratamentoDadosVersao: 'tratamento-dados@2026-06-22',
          aceiteEm: '2026-06-22T10:00:00.000Z',
        },
        areaEspecialidade: 'TECNOLOGIA',
        documentos: [{ tipo: 'comprovativo', url: 'https://www.usepdc.com/docs/mentor.pdf' }],
      }),
    });

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      code: 'EXTERNAL_CREATOR_ONBOARDING_TEMPORARILY_DISABLED',
    });
    expect(escolherRoleMock).not.toHaveBeenCalled();
  });
});

describe('POST /finalizar/verificar-otp — legacy role upgrade after OTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verificarOtpMock.mockResolvedValue(undefined);
    authSessionServiceMock.rotate.mockResolvedValue(MOCK_TOKENS_FRESH);
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

    const res = await oauthRoutes.request('/finalizar/verificar-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${provisionalToken}; refresh_token=current-refresh`,
      },
      body: JSON.stringify({ otp: '123456' }),
    });

    expect(res.status).toBe(200);
    expect(verificarOtpMock).toHaveBeenCalledWith('user-42', '123456');
    expect(authServiceMock.getUserById).toHaveBeenCalledWith('user-42');
    expect(authSessionServiceMock.rotate).toHaveBeenCalledWith('current-refresh', mentorUser);
    expect(setAuthCookiesMock).toHaveBeenCalledWith(expect.anything(), MOCK_TOKENS_FRESH);
    expect(await res.json()).toMatchObject({ role: 'mentor', onboardingCompleto: true });
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

    const res = await oauthRoutes.request('/finalizar/verificar-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${provisionalToken}; refresh_token=current-refresh`,
      },
      body: JSON.stringify({ otp: '654321' }),
    });

    expect(res.status).toBe(200);
    expect(authSessionServiceMock.rotate).toHaveBeenCalledWith('current-refresh', instituicaoUser);
    expect(setAuthCookiesMock).toHaveBeenCalledWith(expect.anything(), MOCK_TOKENS_FRESH);
    expect(await res.json()).toMatchObject({ role: 'instituicao' });
  });

  it('returns 400 when OTP is invalid', async () => {
    const provisionalToken = await makeTestToken({
      sub: 'user-42',
      role: 'estudante',
      onboardingCompleto: false,
    });
    verificarOtpMock.mockRejectedValue(new AuthDomainError('Código inválido ou expirado', 400));

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

  it('não cria nova sessão quando o refresh cookie está ausente', async () => {
    const provisionalToken = await makeTestToken({
      sub: 'user-42',
      role: 'estudante',
      onboardingCompleto: false,
    });
    authServiceMock.getUserById.mockResolvedValue({
      id: 'user-42',
      email: 'mentor@pdc.ao',
      role: 'mentor',
      oauthVerified: true,
      onboardingCompleto: true,
    });

    const res = await oauthRoutes.request('/finalizar/verificar-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${provisionalToken}`,
      },
      body: JSON.stringify({ otp: '123456' }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Sessão expirada' });
    expect(authSessionServiceMock.rotate).not.toHaveBeenCalled();
    expect(authSessionServiceMock.issue).not.toHaveBeenCalled();
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
  });

  it('não expõe detalhes de falhas internas ao cliente', async () => {
    const provisionalToken = await makeTestToken({
      sub: 'user-42',
      role: 'estudante',
      onboardingCompleto: false,
    });
    verificarOtpMock.mockRejectedValue(new Error('redis://user:secret@internal-host:6379'));

    const res = await oauthRoutes.request('/finalizar/verificar-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${provisionalToken}`,
      },
      body: JSON.stringify({ otp: '123456' }),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Erro interno' });
  });

  it('não confia num status arbitrário anexado por uma dependência', async () => {
    const provisionalToken = await makeTestToken({
      sub: 'user-42',
      role: 'estudante',
      onboardingCompleto: false,
    });
    verificarOtpMock.mockRejectedValue(
      Object.assign(new Error('redis://user:secret@internal-host:6379'), { status: 400 }),
    );

    const res = await oauthRoutes.request('/finalizar/verificar-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${provisionalToken}`,
      },
      body: JSON.stringify({ otp: '123456' }),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Erro interno' });
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

  it('produção ignora origin público não confiável e usa o callback configurado', async () => {
    const { env } = await import('../lib/env.js');
    const previousNodeEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      const res = await oauthRoutes.request('/linkedin', {
        headers: { 'x-pdc-public-origin': 'https://attacker.example' },
      });

      expect(res.status).toBe(302);
      const location = new URL(res.headers.get('location') ?? 'http://invalid');
      expect(location.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3001/auth/linkedin/callback',
      );
    } finally {
      env.NODE_ENV = previousNodeEnv;
    }
  });

  it('LinkedIn: falha de forma controlada quando não consegue persistir state', async () => {
    redisMock.set.mockReset();
    redisMock.set.mockRejectedValueOnce(new Error('Upstash quota exceeded'));

    const res = await oauthRoutes.request('/linkedin');

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:5173/login?error=oauth_unavailable');
  });

  it('Google: falha de forma controlada quando não consegue persistir state', async () => {
    redisMock.set.mockReset();
    redisMock.set.mockRejectedValueOnce(new Error('Upstash quota exceeded'));

    const res = await oauthRoutes.request('/google');

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:5173/login?error=oauth_unavailable');
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

describe('OAuth callback - state browser-bound e fail-closed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authServiceMock.findOrCreateUser.mockResolvedValue(MOCK_USER_ONBOARDED);
    authSessionServiceMock.issue.mockResolvedValue(MOCK_TOKENS);
    authServiceMock.setOauthProvider.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejeita callback válido apresentado por outro browser', async () => {
    redisMock.eval.mockResolvedValueOnce(1);

    const state = makeOAuthState();
    const res = await oauthRoutes.request(
      `/linkedin/callback?code=auth-code&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: `oauth_state=${makeOAuthState({ nonce: 'other-browser' })}` } },
    );

    expect(res.status).toBe(400);
    expect(redisMock.eval).not.toHaveBeenCalled();
    expect(authServiceMock.findOrCreateUser).not.toHaveBeenCalled();
  });

  it('redireciona de forma controlada quando o consumo atómico falha', async () => {
    redisMock.eval.mockReset();
    redisMock.eval.mockRejectedValueOnce(new Error('Redis unavailable'));

    const state = makeOAuthState();
    const res = await callbackRequest('/linkedin/callback', state);

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:5173/login?error=oauth_unavailable');
    expect(authServiceMock.findOrCreateUser).not.toHaveBeenCalled();
  });
});
