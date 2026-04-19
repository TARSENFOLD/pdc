import { describe, expect, it, vi, beforeEach } from 'vitest';
import { eventBus } from './event-bus.js';
import { strapiPost, strapiPut } from '../strapi/strapi.client.js';
import type { StrapiSingleResponse } from '../strapi/strapi.types.js';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
}));

describe('EventBus Integration (Approach §1.3 Registry)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.removeAllListeners();
  });

  it('deve aguardar handlers reais e marcar como processado apenas no fim', async () => {
    const handler1 = vi.fn().mockResolvedValue(undefined);
    const handler2 = vi.fn().mockResolvedValue(undefined);

    eventBus.register('test.integration', handler1);
    eventBus.register('test.integration', handler2);

    vi.mocked(strapiPost).mockResolvedValueOnce({ data: { id: 100 } } as StrapiSingleResponse<unknown>);
    vi.mocked(strapiPut).mockResolvedValueOnce({ data: { id: 100, processed: true } } as StrapiSingleResponse<unknown>);

    await eventBus.publishWithOutbox('test.integration', { ok: true });

    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
    
    expect(strapiPut).toHaveBeenCalledWith('/domain-events/100', expect.objectContaining({
      processed: true,
      processedAt: expect.any(String)
    }));
  });

  it('não deve marcar como processado se um handler falhar (Retry requirement)', async () => {
    const handlerSuccess = vi.fn().mockResolvedValue(undefined);
    const handlerFail = vi.fn().mockRejectedValue(new Error('Handler integration failure'));

    eventBus.register('test.partial', handlerSuccess);
    eventBus.register('test.partial', handlerFail);

    vi.mocked(strapiPost).mockResolvedValueOnce({ data: { id: 101 } } as StrapiSingleResponse<unknown>);

    await expect(eventBus.publishWithOutbox('test.partial', {})).rejects.toThrow();

    // Se falhou, NUNCA deve chamar o strapiPut para marcar como processed
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('deve tratar retorno de status "retryable_error" como falha do outbox', async () => {
    // Cenário: O handler não explode (rejection), mas retorna um objeto indicando erro reprocessável.
    // Conforme §1.1 da Approach, processed=true só se todos resolvem com sucesso.
    const handlerRetryable = vi.fn().mockResolvedValue({ status: 'retryable_error', reason: 'token-failure' });

    eventBus.register('test.retryable', handlerRetryable);

    vi.mocked(strapiPost).mockResolvedValueOnce({ data: { id: 102 } } as StrapiSingleResponse<unknown>);

    await expect(eventBus.publishWithOutbox('test.retryable', {})).rejects.toThrow();

    expect(strapiPut).not.toHaveBeenCalled();
  });
});
