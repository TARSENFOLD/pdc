import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@pdc/shared';
import { DomainEventName } from '../modules/events/types.js';

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
}));

const authServiceMock = vi.hoisted(() => ({
  generateTokens: vi.fn(),
  saveRefreshToken: vi.fn(),
  getUserById: vi.fn(),
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

vi.mock('../lib/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    DEV_SKIP_OTP: 'false',
    JWT_SECRET: 'test-secret-at-least-32-chars-long!!',
    API_URL: 'http://localhost:3001',
    FRONTEND_URL: 'http://localhost:5173',
  },
}));

vi.mock('../lib/redis.js', () => ({ hasRedis: true, redis: redisMock }));

vi.mock('../modules/auth/auth.service.js', () => ({ authService: authServiceMock }));

vi.mock('../modules/auth/otp.service.js', () => ({ otpService: otpServiceMock }));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: vi.fn(async (_c: unknown, next: () => Promise<void>) => { await next(); }),
}));

vi.mock('../modules/auth/auth.helper.js', () => ({
  getAuthCookieOptions: vi.fn(() => ({ path: '/', httpOnly: true })),
  setAuthCookies: setAuthCookiesMock,
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: { publishWithOutbox: publishWithOutboxMock },
}));

vi.mock('pino', () => ({
  default: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
}));

import { otpRoutes } from './auth.otp.js';

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
    authServiceMock.generateTokens.mockResolvedValue({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    authServiceMock.saveRefreshToken.mockResolvedValue(undefined);
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
    expect(setAuthCookiesMock).toHaveBeenCalledWith(expect.anything(), 'access-token', 'refresh-token');
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
});