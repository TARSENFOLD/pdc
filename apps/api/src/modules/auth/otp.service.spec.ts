import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const redisMock = vi.hoisted(() => ({
  eval: vi.fn<(script: string, keys: string[], args: unknown[]) => Promise<number>>(),
  set: vi.fn<(key: string, value: unknown, options?: { ex?: number }) => Promise<'OK' | null>>(),
  del: vi.fn<(key: string) => Promise<number>>(),
}));

const redisState = vi.hoisted(() => ({ hasPrimaryRedis: true }));
vi.mock('../../lib/redis.js', () => ({
  get hasPrimaryRedis() {
    return redisState.hasPrimaryRedis;
  },
  redis: redisMock,
}));
const envState = vi.hoisted((): { OTP_HASH_SECRET: string | undefined } => ({
  OTP_HASH_SECRET: 'test-otp-hmac-secret-for-tests-minimum-32-chars',
}));
vi.mock('../../lib/env.js', () => ({ env: envState }));

import { otpService } from './otp.service.js';

describe('otpService Redis invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisState.hasPrimaryRedis = true;
    envState.OTP_HASH_SECRET = 'test-otp-hmac-secret-for-tests-minimum-32-chars';
    redisMock.set.mockResolvedValue('OK');
    redisMock.del.mockResolvedValue(1);
  });

  it('guarda apenas o hash do OTP com TTL de dez minutos', async () => {
    await otpService.storeOtp('user-1', '123456', 'email');

    const expectedHash = createHmac('sha256', String(envState.OTP_HASH_SECRET)).update('123456').digest('hex');
    expect(redisMock.set).toHaveBeenCalledWith('otp:user-1:email', expectedHash, { ex: 600 });
    expect(redisMock.set).not.toHaveBeenCalledWith(expect.anything(), '123456', expect.anything());
  });

  it('compara e consome o OTP numa única operação atómica', async () => {
    redisMock.eval.mockResolvedValueOnce(1);

    await expect(otpService.verifyOtp('user-1', '123456', 'email')).resolves.toBe(true);

    const expectedHash = createHmac('sha256', String(envState.OTP_HASH_SECRET)).update('123456').digest('hex');
    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('DEL'),
      ['otp:user-1:email'],
      [expectedHash],
    );
    expect(redisMock.del).not.toHaveBeenCalled();
  });

  it('aplica janela fixa no limite SMS sem renovar TTL em pedidos bloqueados', async () => {
    redisMock.eval.mockResolvedValueOnce(4);

    await expect(otpService.checkSmsRateLimit('+244923456789')).rejects.toMatchObject({ status: 429 });

    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('if value == 1'),
      ['otp:sms:ratelimit:+244923456789'],
      [600],
    );
  });

  it('falha fechado quando o Redis primário não está configurado', async () => {
    redisState.hasPrimaryRedis = false;

    await expect(otpService.storeOtp('user-1', '123456', 'email'))
      .rejects.toThrow('OTP requer Redis');
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it('falha fechado quando o segredo de hash OTP está ausente', async () => {
    envState.OTP_HASH_SECRET = undefined;

    await expect(otpService.storeOtp('user-1', '123456', 'email'))
      .rejects.toThrow('OTP_HASH_SECRET não configurado');
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it('falha quando o Redis não confirma a persistência do OTP', async () => {
    redisMock.set.mockResolvedValueOnce(null);

    await expect(otpService.storeOtp('user-1', '123456', 'email'))
      .rejects.toThrow('Falha ao persistir OTP');
  });
});
