import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from './event-bus.js';
import { strapiPost, strapiPut } from '../strapi/strapi.client.js';
import { DomainEventName, type StrapiSingleResponse } from '@pdc/shared';

function singleResponse<T>(data: T & { id: string | number }): StrapiSingleResponse<T> {
  return { data, meta: {} };
}

vi.mock('../strapi/strapi.client.js', () => ({
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
}));

vi.mock('../../lib/redis.js', () => ({
  redis: {
    sadd: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn(),
  },
}));

describe('EventBus Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve marcar evento como processado após execução', async () => {
    vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({ id: 100 }));
    vi.mocked(strapiPut).mockResolvedValueOnce(singleResponse({ id: 100, processed: true }));

    await eventBus.publishWithOutbox(DomainEventName.CURSO_ATUALIZADO, {
      cursoId: 'curso-1',
      autorId: 'autor-1',
    });

    expect(strapiPut).toHaveBeenCalledWith(expect.stringContaining('/100'), expect.objectContaining({
      processed: true
    }));
  });
});
