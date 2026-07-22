import { afterEach, describe, expect, it, vi } from 'vitest';
import { probeRedisReadiness } from './redis.js';

describe('probeRedisReadiness', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('exige PONG e uma escrita com TTL', async () => {
    const client = {
      ping: vi.fn().mockResolvedValue('PONG'),
      set: vi.fn().mockResolvedValue('OK'),
    };

    await expect(probeRedisReadiness(client)).resolves.toBe(true);
    expect(client.set).toHaveBeenCalledWith(
      'pdc:health:readiness',
      expect.any(Number),
      { ex: 5 },
    );
  });

  it('delega ao probe cancelável fornecido pelo adapter real', async () => {
    const client = {
      ping: vi.fn(),
      set: vi.fn(),
      probeReadiness: vi.fn().mockResolvedValue(true),
    };

    await expect(probeRedisReadiness(client, 25)).resolves.toBe(true);
    expect(client.probeReadiness).toHaveBeenCalledWith(25);
    expect(client.ping).not.toHaveBeenCalled();
    expect(client.set).not.toHaveBeenCalled();
  });

  it('falha fechado quando o probe do adapter rejeita', async () => {
    const client = {
      ping: vi.fn(),
      set: vi.fn(),
      probeReadiness: vi.fn().mockRejectedValue(new Error('adapter unavailable')),
    };

    await expect(probeRedisReadiness(client, 25)).resolves.toBe(false);
  });

  it('fica indisponível quando leitura funciona mas escrita é recusada', async () => {
    const client = {
      ping: vi.fn().mockResolvedValue('PONG'),
      set: vi.fn().mockRejectedValue(new Error('quota exceeded')),
    };

    await expect(probeRedisReadiness(client)).resolves.toBe(false);
  });

  it('termina com false quando ping não responde dentro do limite', async () => {
    vi.useFakeTimers();
    const client = {
      ping: vi.fn(() => new Promise<string>(() => undefined)),
      set: vi.fn().mockResolvedValue('OK' as const),
    };

    const readiness = probeRedisReadiness(client, 25);
    await vi.advanceTimersByTimeAsync(25);

    await expect(readiness).resolves.toBe(false);
    expect(client.set).not.toHaveBeenCalled();
  });

  it('termina com false quando a escrita não responde dentro do limite', async () => {
    vi.useFakeTimers();
    const client = {
      ping: vi.fn().mockResolvedValue('PONG'),
      set: vi.fn(() => new Promise<'OK' | null>(() => undefined)),
    };

    const readiness = probeRedisReadiness(client, 25);
    await vi.advanceTimersByTimeAsync(25);

    await expect(readiness).resolves.toBe(false);
  });
});
