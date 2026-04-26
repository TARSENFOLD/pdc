import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from './event-bus.js';
import { strapiPost, strapiPut } from '../strapi/strapi.client.js';

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
    vi.mocked(strapiPost).mockResolvedValueOnce({ data: { id: 100 } } as any);
    vi.mocked(strapiPut).mockResolvedValueOnce({ data: { id: 100, processed: true } } as any);

    await eventBus.publishWithOutbox('test.event' as any, { foo: 'bar' });

    expect(strapiPut).toHaveBeenCalledWith(expect.stringContaining('/100'), expect.objectContaining({
      processed: true
    }));
  });
});
