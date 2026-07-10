import { beforeEach, describe, expect, it, vi } from 'vitest';
import { marcarParaRecalculo } from './reputation.service.js';
import { redis } from '../../lib/redis.js';

vi.mock('../../lib/redis.js', () => ({
  redis: {
    sadd: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPut: vi.fn(),
}));

vi.mock('../feature-flags/feature-flags.service.js', () => ({
  getEffectiveFlags: vi.fn().mockResolvedValue({ REPUTATION_VISIBLE: true }),
}));

describe('reputation.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marca perfil para recálculo e invalida cache de reputação', async () => {
    await marcarParaRecalculo('perfil-1', 'curso.publicado');

    expect(redis.sadd).toHaveBeenCalledWith('reputation:recalc_queue', 'perfil-1');
    expect(redis.del).toHaveBeenCalledWith('reputation:perfil-1');
  });

  it('propaga erro quando Redis falha para permitir retry upstream', async () => {
    vi.mocked(redis.sadd).mockRejectedValueOnce(new Error('down'));

    await expect(marcarParaRecalculo('perfil-1', 'curso.publicado')).rejects.toThrow('down');
  });
});