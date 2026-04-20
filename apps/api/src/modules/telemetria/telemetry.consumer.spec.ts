import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processEvent } from './consumer.js';
import { redis } from '../../lib/redis.js';
import { strapiPost } from '../strapi/strapi.client.js';

vi.mock('../../lib/redis.js', () => ({
  redis: {
    sadd: vi.fn(),
    expire: vi.fn(),
  },
}));

vi.mock('../strapi/strapi.client.js', () => ({
  strapiPost: vi.fn(),
}));

describe('telemetria/consumer processEvent', () => {
  const mockEvent = {
    eventId: 'evt-123',
    tipo: 'simulacao.iniciada',
    timestamp: 1625097600000,
    sessionId: 'session-abc',
    correlationId: 'corr-xyz',
    url: 'https://pdc.ao/sim',
    targetType: 'botao',
    targetId: 'btn-iniciar',
    visibilityState: 'visible',
    perfilId: 'perfil-456',
    payload: {
      foo: 'bar',
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('deve persistir evento no Strapi com campo "dados" e sem wrapper duplo (D20)', async () => {
    // Mock redis.sadd para retornar 1 (novo evento)
    vi.mocked(redis.sadd).mockResolvedValue(1);
    vi.mocked(strapiPost).mockResolvedValue({ data: { id: 1 } } as any);

    await processEvent(JSON.stringify(mockEvent));

    expect(strapiPost).toHaveBeenCalledWith('/telemetrias', expect.objectContaining({
      eventId: 'evt-123',
      tipo: 'simulacao.iniciada',
      dados: { foo: 'bar' }, // D20: deve ser 'dados', não 'payload'
      visibilityState: 'visible',
      perfil: 'perfil-456',
    }));
    
    // Verifica se NÃO enviou o campo 'payload'
    const lastCall = vi.mocked(strapiPost).mock.calls[0]?.[1] as any;
    expect(lastCall.payload).toBeUndefined();
  });

  it('deve garantir idempotência via Redis', async () => {
    // Mock redis.sadd para retornar 0 (evento já visto)
    vi.mocked(redis.sadd).mockResolvedValue(0);

    await processEvent(JSON.stringify(mockEvent));

    expect(strapiPost).not.toHaveBeenCalled();
  });

  it('deve invalidar evento via Sanity check se necessário', async () => {
    vi.mocked(redis.sadd).mockResolvedValue(1);
    
    // Evento com timestamp futuro (regra de sanity simplificada para o teste)
    const invalidEvent = {
      ...mockEvent,
      timestamp: Date.now() + 1000000,
    };

    await processEvent(JSON.stringify(invalidEvent));

    expect(strapiPost).toHaveBeenCalledWith('/telemetrias', expect.objectContaining({
      dados: expect.objectContaining({
        invalidated: true,
      }),
    }));
  });
});
