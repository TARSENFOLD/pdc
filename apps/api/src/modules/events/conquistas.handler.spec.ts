import { describe, it, expect, vi, beforeEach } from 'vitest';
import { conquistasHandler } from './conquistas.handler.js';
import { strapiGet } from '../strapi/strapi.client.js';
import { type DomainEvent, DomainEventName } from './types.js';

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
    vi.mocked(strapiGet).mockResolvedValue({ 
      data: [{ id: 'perf-789' }] 
    } as unknown);

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
