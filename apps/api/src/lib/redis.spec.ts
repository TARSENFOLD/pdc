import { describe, expect, it, vi } from 'vitest';
import { probeRedisReadiness } from './redis.js';

describe('probeRedisReadiness', () => {
  it('exige PONG e uma escrita com TTL', async () => {
    const client = {
      ping: vi.fn().mockResolvedValue('PONG'),
      set: vi.fn().mockResolvedValue('OK'),
    };

    await expect(probeRedisReadiness(client)).resolves.toBe(true);
    expect(client.set).toHaveBeenCalledWith(
      'health:readiness',
      expect.any(Number),
      { ex: 5 },
    );
  });

  it('fica indisponível quando leitura funciona mas escrita é recusada', async () => {
    const client = {
      ping: vi.fn().mockResolvedValue('PONG'),
      set: vi.fn().mockRejectedValue(new Error('quota exceeded')),
    };

    await expect(probeRedisReadiness(client)).resolves.toBe(false);
  });
});
