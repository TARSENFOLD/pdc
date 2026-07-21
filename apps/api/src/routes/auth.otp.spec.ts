import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@pdc/shared';
import { DomainEventName } from '../modules/events/types.js';
import { Hono } from 'hono';
import type { AuthVariables } from '../modules/auth/auth.middleware.js';

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
}));

const authServiceMock = vi.hoisted(() => ({
  getUserById: vi.fn(),
}));

const authSessionServiceMock = vi.hoisted(() => ({
  issue: vi.fn(),
  revoke: vi.fn(),
  isAccessTokenCurrent: vi.fn().mockResolvedValue(true),
}));
const trustedDeviceServiceMock = vi.hoisted(() => ({
  issue: vi.fn(),
  belongsToUser: vi.fn(),
  revoke: vi.fn(),
}));

const otpServiceMock = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  generateOtp: vi.fn(),
  storeOtp: vi.fn(),
  sendOtpEmail: vi.fn(),
  sendOtpSms: vi.fn(),
  validateE164: vi.fn(),
  deleteOtp: vi.fn(),
}));

const publishWithOutboxMock = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'evt-login-1' }));
const setAuthCookiesMock = vi.hoisted(() => vi.fn());
const setTrustedDeviceCookieMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    DEV_SKIP_OTP: 'false',
    JWT_SECRET: 'test-secret-at-least-32-chars-long!!',
    API_URL: 'http://localhost:3001',
    FRONTEND_URL: 'http://localhost:5173',
  },
}));

vi.mock('../lib/redis.js', () => ({ hasPrimaryRedis: true, redis: redisMock }));

vi.mock('../modules/auth/auth.service.js', () => ({ authService: authServiceMock }));
vi.mock('../modules/auth/auth-session.service.js', () => ({
  authSessionService: authSessionServiceMock,
}));
vi.mock('../modules/auth/trusted-device.service.js', () => ({
  trustedDeviceService: trustedDeviceServiceMock,
}));

vi.mock('../modules/auth/otp.service.js', () => ({ otpService: otpServiceMock }));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: vi.fn(async (_c: unknown, next: () => Promise<void>) => { await next(); }),
}));

vi.mock('../modules/auth/auth.helper.js', () => ({
  getAuthCookieOptions: vi.fn(() => ({ path: '/', httpOnly: true })),
  setAuthCookies: setAuthCookiesMock,
  setTrustedDeviceCookie: setTrustedDeviceCookieMock,
  TRUSTED_DEVICE_COOKIE: 'trusted_device',
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: { publishWithOutbox: publishWithOutboxMock },
}));

vi.mock('pino', () => ({
  default: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
}));

import { otpRoutes } from './auth.otp.js';
import { initiate2faChallenge } from './auth.otp.js';

const user: User = {
  id: 'user-1',
  email: 'user@pdc.ao',
  nome: 'Utilizador PDC',
  role: 'estudante',
  areasInteresse: [],
  conquistas: [],
  xp: 0,
  reputacao: 0,
  reputacaoTier: 'BRONZE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('POST /auth/otp/verify — LOGIN event', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.get.mockResolvedValue('user-1');
    redisMock.del.mockResolvedValue(1);
    otpServiceMock.verifyOtp.mockResolvedValue(true);
    authServiceMock.getUserById.mockResolvedValue(user);
    authSessionServiceMock.issue.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      refreshMaxAgeSeconds: 7_776_000,
    });
    trustedDeviceServiceMock.issue.mockResolvedValue('trusted-device-token');
    trustedDeviceServiceMock.revoke.mockResolvedValue(undefined);
    authSessionServiceMock.revoke.mockResolvedValue('user-1');
    publishWithOutboxMock.mockResolvedValue({ id: 'evt-login-1' });
  });

  it('emite LOGIN apenas depois de OTP válido e cookies emitidos', async () => {
    const res = await otpRoutes.request('/verify', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cookie': 'auth_challenge=challenge-1',
        'x-forwarded-for': '203.0.113.7, 10.0.0.1',
      },
      body: JSON.stringify({ otp: '123456', canal: 'email' }),
    });

    expect(res.status).toBe(200);
    expect(otpServiceMock.verifyOtp).toHaveBeenCalledWith('user-1', '123456', 'email');
    expect(setAuthCookiesMock).toHaveBeenCalledWith(expect.anything(), {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      refreshMaxAgeSeconds: 7_776_000,
    });
    expect(redisMock.del.mock.invocationCallOrder[0]).toBeLessThan(
      setAuthCookiesMock.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.LOGIN, {
      userId: 'user-1',
      ip: '203.0.113.7',
    });
  });

  it('não emite LOGIN quando OTP é inválido', async () => {
    otpServiceMock.verifyOtp.mockResolvedValueOnce(false);

    const res = await otpRoutes.request('/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cookie': 'auth_challenge=challenge-1' },
      body: JSON.stringify({ otp: '000000', canal: 'email' }),
    });

    expect(res.status).toBe(400);
    expect(publishWithOutboxMock).not.toHaveBeenCalled();
  });

  it('devolve 503 sem cookies quando a leitura do challenge falha', async () => {
    redisMock.get.mockRejectedValueOnce(new Error('Redis unavailable'));

    const res = await otpRoutes.request('/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cookie': 'auth_challenge=challenge-1' },
      body: JSON.stringify({ otp: '123456', canal: 'email' }),
    });

    expect(res.status).toBe(503);
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
    expect(setTrustedDeviceCookieMock).not.toHaveBeenCalled();
  });

  it('não emite cookies e compensa credenciais quando o challenge não é consumido', async () => {
    redisMock.del.mockResolvedValueOnce(0);

    const res = await otpRoutes.request('/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cookie': 'auth_challenge=challenge-1' },
      body: JSON.stringify({ otp: '123456', canal: 'email', trustDevice: true }),
    });

    expect(res.status).toBe(503);
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
    expect(setTrustedDeviceCookieMock).not.toHaveBeenCalled();
    expect(authSessionServiceMock.revoke).toHaveBeenCalledWith('refresh-token');
    expect(trustedDeviceServiceMock.revoke).toHaveBeenCalledWith('trusted-device-token');
    expect(publishWithOutboxMock).not.toHaveBeenCalled();
  });
});

describe('initiate2faChallenge — dependências', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    trustedDeviceServiceMock.belongsToUser.mockResolvedValue(false);
    redisMock.set.mockResolvedValue('OK');
    otpServiceMock.generateOtp.mockReturnValue('123456');
    otpServiceMock.storeOtp.mockResolvedValue(undefined);
    otpServiceMock.sendOtpEmail.mockResolvedValue(undefined);
  });

  it('devolve 503 quando não consegue validar o dispositivo confiável', async () => {
    trustedDeviceServiceMock.belongsToUser.mockRejectedValueOnce(new Error('Redis unavailable'));
    const app = new Hono<{ Variables: AuthVariables }>();
    app.post('/challenge', (c) => initiate2faChallenge(c, user));

    const res = await app.request('/challenge', {
      method: 'POST',
      headers: { cookie: 'trusted_device=device-token' },
    });

    expect(res.status).toBe(503);
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it('não consulta dispositivos confiáveis quando o browser não envia token', async () => {
    const app = new Hono<{ Variables: AuthVariables }>();
    app.post('/challenge', (c) => initiate2faChallenge(c, user));

    const res = await app.request('/challenge', { method: 'POST' });

    expect(res.status).toBe(200);
    expect(trustedDeviceServiceMock.belongsToUser).not.toHaveBeenCalled();
    expect(redisMock.set).toHaveBeenCalledWith(expect.stringMatching(/^auth_challenge:/), 'user-1', { ex: 600 });
  });

  it('devolve 503 quando não consegue persistir o challenge', async () => {
    redisMock.set.mockRejectedValueOnce(new Error('Redis unavailable'));
    const app = new Hono<{ Variables: AuthVariables }>();
    app.post('/challenge', (c) => initiate2faChallenge(c, user));

    const res = await app.request('/challenge', { method: 'POST' });

    expect(res.status).toBe(503);
    expect(otpServiceMock.storeOtp).not.toHaveBeenCalled();
  });
});
