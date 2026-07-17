import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const redisMock = vi.hoisted(() => ({
  eval: vi.fn<(script: string, keys: string[], args: unknown[]) => Promise<number>>(),
  set: vi.fn<(key: string, value: unknown, options?: { ex?: number }) => Promise<'OK' | null>>(),
  del: vi.fn<(key: string) => Promise<number>>(),
}));

vi.mock('../../lib/redis.js', () => ({ hasRedis: true, redis: redisMock }));
vi.mock('../../lib/env.js', () => ({ env: {} }));

import { otpService } from './otp.service.js';

describe('otpService Redis invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.set.mockResolvedValue('OK');
    redisMock.del.mockResolvedValue(1);
  });

  it('guarda apenas o hash do OTP com TTL de dez minutos', async () => {
    await otpService.storeOtp('user-1', '123456', 'email');

    const expectedHash = createHash('sha256').update('123456').digest('hex');
    expect(redisMock.set).toHaveBeenCalledWith('otp:user-1:email', expectedHash, { ex: 600 });
    expect(redisMock.set).not.toHaveBeenCalledWith(expect.anything(), '123456', expect.anything());
  });

  it('compara e consome o OTP numa única operação atómica', async () => {
    redisMock.eval.mockResolvedValueOnce(1);

    await expect(otpService.verifyOtp('user-1', '123456', 'email')).resolves.toBe(true);

    const expectedHash = createHash('sha256').update('123456').digest('hex');
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
});
