import { describe, it, expect, vi, beforeEach } from 'vitest';
import { conquistasHandler } from './conquistas.handler.js';
import { strapiGet } from '../strapi/strapi.client.js';
import { type DomainEvent, DomainEventName } from './types.js';
import type { StrapiListResponse } from '@pdc/shared';

function listResponse<T>(data: Array<T & { id: string | number }>): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
}));

vi.mock('../conquistas/conquistas.engine.js', () => ({
  conquistaEngine: {
    verificarConquistas: vi.fn().mockResolvedValue([]),
  }
}));

describe('ConquistasHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve processar evento e chamar engine', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([{ id: 'perf-789' }]));

    const event: DomainEvent = {
      id: 'evt-1',
      name: DomainEventName.TENTATIVA_CONCLUIDA,
      payload: { perfilId: 'perf-789' },
      timestamp: new Date().toISOString()
    };

    await conquistasHandler(event);
    expect(strapiGet).toHaveBeenCalledWith('/perfis', expect.any(Object));
  });
});
