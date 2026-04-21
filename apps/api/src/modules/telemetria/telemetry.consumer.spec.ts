import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processTelemetryQueue } from './consumer.js';
import { redis } from '../../lib/redis.js';
import { strapiPost } from '../strapi/strapi.client.js';

vi.mock('../../lib/redis.js', () => ({
  redis: {
    rpoplpush: vi.fn(),
    lrem: vi.fn(),
    sadd: vi.fn(),
    expire: vi.fn(),
  },
}));

vi.mock('../strapi/strapi.client.js', () => ({
  strapiPost: vi.fn(),
}));

describe('Telemetry Consumer', () => {
  const mockEvent = {
    eventId: 'evt-123',
    tipo: 'simulacao.iniciada',
    timestamp: new Date().toISOString(),
    perfilId: 'perfil-456',
    payload: { foo: 'bar' },
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it.skip('deve processar um evento da fila e persistir no Strapi', async () => {
    vi.mocked(redis.rpoplpush).mockResolvedValueOnce(JSON.stringify(mockEvent)).mockResolvedValueOnce(null);
    vi.mocked(strapiPost).mockResolvedValue({ data: { id: 1 } } as unknown);

    // Chamar em um contexto que não executa o while(true) para sempre
    await processTelemetryQueue();

    expect(redis.rpoplpush).toHaveBeenCalledWith('telemetry_queue', 'telemetry_processing_queue');
    expect(strapiPost).toHaveBeenCalledWith('/telemetrias', expect.objectContaining({
      eventId: 'evt-123',
      dados: { foo: 'bar' },
      perfil: 'perfil-456',
    }));
    expect(redis.lrem).toHaveBeenCalledWith('telemetry_processing_queue', 1, JSON.stringify(mockEvent));
  });
});
