import { beforeEach, describe, expect, it, vi } from 'vitest';

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  eval: vi.fn(),
}));
vi.mock('../../lib/redis.js', () => ({ redis: redisMock }));

import { TRUSTED_DEVICE_TTL_SECONDS } from './auth.constants.js';
import { trustedDeviceService } from './trusted-device.service.js';

describe('trustedDeviceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.eval.mockResolvedValue(1);
  });

  it('persiste apenas o hash de uma credencial de alta entropia', async () => {
    const token = await trustedDeviceService.issue('user-1');

    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('ZREMRANGEBYSCORE'),
      [
        expect.stringMatching(/^trusted_device:[a-f0-9]{64}$/),
        'user_trusted_devices_v2:user-1',
      ],
      [
        'user-1',
        TRUSTED_DEVICE_TTL_SECONDS,
        expect.any(Number),
        expect.any(Number),
      ],
    );
    expect(JSON.stringify(redisMock.eval.mock.calls)).not.toContain(token);
  });

  it('só aceita a credencial vinculada ao mesmo utilizador', async () => {
    redisMock.get.mockResolvedValueOnce('user-1');

    await expect(trustedDeviceService.belongsToUser('device-token', 'user-1')).resolves.toBe(true);
    redisMock.get.mockResolvedValueOnce('user-2');
    await expect(trustedDeviceService.belongsToUser('device-token', 'user-1')).resolves.toBe(false);
  });

  it('revoga o dispositivo corrente sem expor o token na chave', async () => {
    redisMock.get.mockResolvedValueOnce('user-1');

    await trustedDeviceService.revoke('device-token');

    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('ZREM'),
      [
        expect.stringMatching(/^trusted_device:[a-f0-9]{64}$/),
        'user_trusted_devices_v2:user-1',
        'user_trusted_devices:user-1',
      ],
      [],
    );
    expect(JSON.stringify(redisMock.eval.mock.calls)).not.toContain('device-token');
  });

  it('revoga todos os dispositivos indexados do utilizador', async () => {
    redisMock.eval
      .mockResolvedValueOnce([1, 1])
      .mockResolvedValueOnce([1, 0])
      .mockResolvedValueOnce([2, 0]);

    await expect(trustedDeviceService.revokeAll('user-1')).resolves.toBe(4);
    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('ZRANGE'),
      ['user_trusted_devices_v2:user-1'],
      [50],
    );
    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('SPOP'),
      ['user_trusted_devices:user-1'],
      [50],
    );
    expect(redisMock.eval).toHaveBeenCalledTimes(3);
  });

  it('renova a lease antes de cada lote de revogação', async () => {
    const renewLease = vi.fn().mockResolvedValue(undefined);
    redisMock.eval.mockResolvedValueOnce([1, 0]).mockResolvedValueOnce([0, 0]);

    await expect(trustedDeviceService.revokeAll('user-1', renewLease)).resolves.toBe(1);
    expect(renewLease).toHaveBeenCalledTimes(2);
  });
});
