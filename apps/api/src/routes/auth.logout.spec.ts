import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';

const authServiceMock = vi.hoisted(() => ({ login: vi.fn(), getUserById: vi.fn() }));
const authSessionServiceMock = vi.hoisted(() => ({
  revoke: vi.fn(),
  verify: vi.fn(),
  rotate: vi.fn(),
  issue: vi.fn(),
  isAccessTokenCurrent: vi.fn().mockResolvedValue(true),
}));
const trustedDeviceServiceMock = vi.hoisted(() => ({
  revoke: vi.fn(),
  belongsToUser: vi.fn(),
}));

const publishWithOutboxMock = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'evt-auth-1' }));
const completeLegalComplianceMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/redis.js', () => ({ hasPrimaryRedis: true, redis: {} }));

vi.mock('../middleware/rateLimit.js', () => ({
  rateLimit: vi.fn(async (_context: unknown, next: () => Promise<void>) => {
    await next();
  }),
  rateLimitRegisto: vi.fn(async (_context: unknown, next: () => Promise<void>) => {
    await next();
  }),
}));

vi.mock('../lib/env.js', () => ({
  env: {
    JWT_SECRET: 'super-secret-at-least-32-chars-long',
    API_URL: 'http://localhost:3001',
    FRONTEND_URL: 'http://localhost:5173',
  },
}));

vi.mock('../modules/auth/auth.service.js', () => ({
  authService: {
    register: vi.fn(),
    login: authServiceMock.login,
    getUserById: authServiceMock.getUserById,
  },
}));

vi.mock('../modules/auth/auth-session.service.js', () => ({
  authSessionService: authSessionServiceMock,
}));
vi.mock('../modules/auth/trusted-device.service.js', () => ({
  trustedDeviceService: trustedDeviceServiceMock,
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: { publishWithOutbox: publishWithOutboxMock },
}));

vi.mock('../modules/auth/auth-compliance.service.js', () => ({
  authComplianceService: { completeLegalCompliance: completeLegalComplianceMock },
}));

import { authRoutes } from './auth.js';
import { StrapiHttpError } from '../modules/strapi/strapi.client.js';
import { DomainEventName } from '../modules/events/types.js';
import { RefreshTokenReuseError } from '../modules/auth/auth-session.errors.js';

async function validAccessToken(userId = 'user-1'): Promise<string> {
  return new SignJWT({ sub: userId, role: 'estudante' })
    .setProtectedHeader({ alg: 'HS256', typ: 'access' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode('super-secret-at-least-32-chars-long'));
}

describe('GET /auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSessionServiceMock.isAccessTokenCurrent.mockResolvedValue(true);
  });

  it('returns null instead of 401 when there is no session cookie', async () => {
    const res = await authRoutes.request('/me');

    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it('clears only an invalid access token and preserves a renewable refresh token', async () => {
    const res = await authRoutes.request('/me', {
      headers: { cookie: 'access_token=invalid; refresh_token=renewable' },
    });

    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('access_token=');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).not.toContain('refresh_token=');
  });

  it('reports dependency failure without converting a valid session into anonymous', async () => {
    authServiceMock.getUserById.mockRejectedValueOnce(new Error('Strapi unavailable'));
    const token = await validAccessToken();

    const res = await authRoutes.request('/me', {
      headers: { cookie: `access_token=${token}; refresh_token=renewable` },
    });

    expect(res.status).toBe(502);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('preserva cookies quando a época de autenticação não pode ser consultada', async () => {
    authSessionServiceMock.isAccessTokenCurrent.mockRejectedValueOnce(new Error('Redis unavailable'));
    const token = await validAccessToken();

    const res = await authRoutes.request('/me', {
      headers: { cookie: `access_token=${token}; refresh_token=renewable` },
    });

    expect(res.status).toBe(503);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(authServiceMock.getUserById).not.toHaveBeenCalled();
  });
});

describe('POST /auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    publishWithOutboxMock.mockResolvedValue({ id: 'evt-auth-1' });
  });

  it('is idempotent and clears cookies even when access token is absent', async () => {
    const res = await authRoutes.request('/logout', { method: 'POST' });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(res.headers.get('set-cookie')).toContain('access_token=');
    expect(res.headers.get('set-cookie')).toContain('refresh_token=');
    expect(res.headers.get('set-cookie')).toContain('Path=/');
  });

  it('revokes a valid refresh token without requiring a valid access token', async () => {
    authSessionServiceMock.revoke.mockResolvedValueOnce('user-1');

    const res = await authRoutes.request('/logout', {
      method: 'POST',
      headers: { cookie: 'refresh_token=refresh-1' },
    });

    expect(res.status).toBe(200);
    expect(authSessionServiceMock.revoke).toHaveBeenCalledWith('refresh-1');
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.LOGOUT, { userId: 'user-1' });
  });

  it('keeps logout successful when the event write fails after revocation', async () => {
    authSessionServiceMock.revoke.mockResolvedValueOnce('user-1');
    publishWithOutboxMock.mockRejectedValueOnce(new Error('outbox unavailable'));

    const res = await authRoutes.request('/logout', {
      method: 'POST',
      headers: { cookie: 'refresh_token=refresh-1' },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toContain('refresh_token=');
  });

  it('clears browser cookies but reports when server revocation cannot be confirmed', async () => {
    authSessionServiceMock.revoke.mockRejectedValueOnce(new Error('Redis unavailable'));

    const res = await authRoutes.request('/logout', {
      method: 'POST',
      headers: { cookie: 'refresh_token=refresh-1' },
    });

    expect(res.status).toBe(503);
    expect(res.headers.get('set-cookie')).toContain('access_token=');
    expect(res.headers.get('set-cookie')).toContain('refresh_token=');
  });
});

describe('POST /auth/compliance/legal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    completeLegalComplianceMock.mockResolvedValue(undefined);
    authServiceMock.getUserById.mockResolvedValue({ id: 'user-1', role: 'estudante' });
  });

  it('não cria uma sessão nova quando o refresh cookie está ausente', async () => {
    const accessToken = await validAccessToken();
    const res = await authRoutes.request('/compliance/legal', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `access_token=${accessToken}`,
      },
      body: JSON.stringify({
        dataNascimento: '1990-01-01',
        aceiteLegal: {
          termosUso: true,
          politicaPrivacidade: true,
          tratamentoDados: true,
          termosUsoVersao: 'termos-uso@2026-06-22',
          politicaPrivacidadeVersao: 'politica-privacidade@2026-06-22',
          tratamentoDadosVersao: 'tratamento-dados@2026-06-22',
        },
      }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Sessão expirada' });
    expect(completeLegalComplianceMock).not.toHaveBeenCalled();
    expect(authSessionServiceMock.rotate).not.toHaveBeenCalled();
    expect(authSessionServiceMock.issue).not.toHaveBeenCalled();
  });

  it('não expõe detalhes de uma falha operacional da regularização', async () => {
    completeLegalComplianceMock.mockRejectedValueOnce(
      new Error('postgres://user:secret@internal-db'),
    );
    const accessToken = await validAccessToken();
    const res = await authRoutes.request('/compliance/legal', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `access_token=${accessToken}; refresh_token=current-refresh`,
      },
      body: JSON.stringify({
        dataNascimento: '1990-01-01',
        aceiteLegal: {
          termosUso: true,
          politicaPrivacidade: true,
          tratamentoDados: true,
          termosUsoVersao: 'termos-uso@2026-06-22',
          politicaPrivacidadeVersao: 'politica-privacidade@2026-06-22',
          tratamentoDadosVersao: 'tratamento-dados@2026-06-22',
        },
      }),
    });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Não foi possível regularizar a conta' });
  });
});

describe('POST /auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps Strapi auth/local 400 to invalid credentials without leaking provider details', async () => {
    authServiceMock.login.mockRejectedValueOnce(
      new StrapiHttpError('Strapi POST /auth/local falhou: 400', 400, '/auth/local'),
    );

    const res = await authRoutes.request('/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: ' Aluno@Traycer.Test ', password: 'password123' }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Credenciais inválidas' });
    expect(authServiceMock.login).toHaveBeenCalledWith('aluno@traycer.test', 'password123');
  });

  it('maps non-auth Strapi failures to service unavailable', async () => {
    authServiceMock.login.mockRejectedValueOnce(
      new StrapiHttpError('Strapi POST /auth/local falhou: 503', 503, '/auth/local'),
    );

    const res = await authRoutes.request('/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'aluno@traycer.test', password: 'password123' }),
    });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Serviço de autenticação indisponível' });
  });

  it('dispensa novo OTP apenas quando senha e dispositivo confiável são válidos', async () => {
    const user = { id: 'user-1', email: 'user@example.com', role: 'estudante' };
    authServiceMock.login.mockResolvedValueOnce(user);
    trustedDeviceServiceMock.belongsToUser.mockResolvedValueOnce(true);
    authSessionServiceMock.issue.mockResolvedValueOnce({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      refreshMaxAgeSeconds: 3_600,
    });

    const res = await authRoutes.request('/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'trusted_device=trusted-token',
      },
      body: JSON.stringify({ email: 'user@example.com', password: 'password123' }),
    });

    expect(res.status).toBe(200);
    expect(authServiceMock.login).toHaveBeenCalledWith('user@example.com', 'password123');
    expect(trustedDeviceServiceMock.belongsToUser).toHaveBeenCalledWith('trusted-token', 'user-1');
    expect(authSessionServiceMock.issue).toHaveBeenCalledWith(user);
  });
});

describe('POST /auth/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSessionServiceMock.verify.mockResolvedValue({
      userId: 'user-1',
      sessionId: 'session-1',
      expiresAt: Math.floor(Date.now() / 1_000) + 3_600,
    });
    authServiceMock.getUserById.mockResolvedValue({ id: 'user-1' });
    authSessionServiceMock.rotate.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      refreshMaxAgeSeconds: 3_600,
    });
  });

  it('substitui o refresh token através da rotação atómica', async () => {
    const res = await authRoutes.request('/refresh', {
      method: 'POST',
      headers: { cookie: 'refresh_token=old-refresh' },
    });

    expect(res.status).toBe(200);
    expect(authSessionServiceMock.verify).toHaveBeenCalledWith('old-refresh');
    expect(authSessionServiceMock.rotate).toHaveBeenCalledWith('old-refresh', { id: 'user-1' });
    expect(res.headers.get('set-cookie')).toContain('refresh_token=new-refresh');
  });

  it('rejeita quando outra rotação já consumiu o token', async () => {
    authSessionServiceMock.rotate.mockResolvedValueOnce(null);

    const res = await authRoutes.request('/refresh', {
      method: 'POST',
      headers: { cookie: 'refresh_token=old-refresh' },
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid refresh token' });
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('access_token=');
    expect(setCookie).toContain('refresh_token=');
  });

  it('remove cookies quando o refresh já não corresponde a uma sessão', async () => {
    authSessionServiceMock.verify.mockResolvedValueOnce(null);

    const res = await authRoutes.request('/refresh', {
      method: 'POST',
      headers: { cookie: 'refresh_token=dead-refresh' },
    });

    expect(res.status).toBe(401);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('access_token=');
    expect(setCookie).toContain('refresh_token=');
    expect(authServiceMock.getUserById).not.toHaveBeenCalled();
  });

  it('revoga os cookies quando deteta reutilização do refresh token', async () => {
    authSessionServiceMock.rotate.mockRejectedValueOnce(new RefreshTokenReuseError());

    const res = await authRoutes.request('/refresh', {
      method: 'POST',
      headers: { cookie: 'refresh_token=old-refresh' },
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid refresh token' });
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('access_token=');
    expect(setCookie).toContain('refresh_token=');
    expect(setCookie).toContain('Path=/');
  });

  it('preserva a sessão e reporta 503 quando uma dependência falha', async () => {
    authServiceMock.getUserById.mockRejectedValueOnce(new Error('Strapi unavailable'));

    const res = await authRoutes.request('/refresh', {
      method: 'POST',
      headers: { cookie: 'refresh_token=old-refresh' },
    });

    expect(res.status).toBe(503);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('reporta 503 quando a verificação do refresh falha operacionalmente', async () => {
    authSessionServiceMock.verify.mockRejectedValueOnce(new Error('Redis unavailable'));

    const res = await authRoutes.request('/refresh', {
      method: 'POST',
      headers: { cookie: 'refresh_token=old-refresh' },
    });

    expect(res.status).toBe(503);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(authServiceMock.getUserById).not.toHaveBeenCalled();
  });
});

describe('DELETE /auth/trusted-device', () => {
  it('é idempotente sem consultar Redis quando o cookie não existe', async () => {
    const res = await authRoutes.request('/trusted-device', { method: 'DELETE' });

    expect(res.status).toBe(200);
    expect(trustedDeviceServiceMock.revoke).not.toHaveBeenCalled();
    expect(res.headers.get('set-cookie')).toContain('trusted_device=');
  });

  it('revoga e remove a credencial do browser corrente', async () => {
    trustedDeviceServiceMock.revoke.mockResolvedValueOnce(undefined);

    const res = await authRoutes.request('/trusted-device', {
      method: 'DELETE',
      headers: { cookie: 'trusted_device=device-token' },
    });

    expect(res.status).toBe(200);
    expect(trustedDeviceServiceMock.revoke).toHaveBeenCalledWith('device-token');
    expect(res.headers.get('set-cookie')).toContain('trusted_device=');
  });

  it('remove a credencial local e reporta 503 quando Redis falha', async () => {
    trustedDeviceServiceMock.revoke.mockRejectedValueOnce(new Error('Redis unavailable'));

    const res = await authRoutes.request('/trusted-device', {
      method: 'DELETE',
      headers: { cookie: 'trusted_device=device-token' },
    });

    expect(res.status).toBe(503);
    expect(res.headers.get('set-cookie')).toContain('trusted_device=');
  });
});
