import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import pino from 'pino';
import * as Sentry from '@sentry/node';
import { processOneTelemetryEvent } from './consumer.js';
import { redis } from '../../lib/redis.js';
import { strapiPost } from '../strapi/strapi.client.js';
import { applySanityRules } from '@pdc/shared';

vi.mock('pino', () => ({
  default: vi.fn(() => ({
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    info: vi.fn(),
  })),
}));

vi.mock('@sentry/node', () => ({
  captureMessage: vi.fn(),
}));

vi.mock('../../lib/redis.js', () => ({
  redis: {
    rpoplpush: vi.fn(),
    lrem: vi.fn(),
    set: vi.fn(),
    llen: vi.fn(),
    lpush: vi.fn(),
    rpush: vi.fn(),
    eval: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    del: vi.fn(),
  },
}));

// dlq.ts shares the same redis mock via the module graph
vi.mock('./dlq.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./dlq.js')>();
  return actual; // use real implementation, which uses mocked redis
});

vi.mock('../strapi/strapi.client.js', () => ({
  strapiPost: vi.fn(),
}));

vi.mock('../../lib/r2.js', () => ({
  uploadColdBatch: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./telemetria.processor.js', () => ({
  telemetriaProcessor: {
    processUserDomain: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../simulacoes/scoring/sim-2-3.engine.js', () => ({
  handleLabEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@pdc/shared', async () => {
  const actual = await vi.importActual<typeof import('@pdc/shared')>('@pdc/shared');
  return {
    ...actual,
    applySanityRules: vi.fn().mockReturnValue({ valid: true }),
    BFF_SANITY_RULES: [],
  };
});

const mockEvent = {
  eventId: 'evt-123',
  tipo: 'simulacao.iniciada',
  timestamp: new Date().toISOString(),
  perfilId: 'perfil-456',
  payload: { foo: 'bar' },
};

describe('processOneTelemetryEvent', () => {
  // consumer.ts calls pino() once at module load — capture the instance here
  // so we can assert on warn/error calls even after vi.clearAllMocks() resets call history
  let logMock: { warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeAll(() => {
    logMock = vi.mocked(pino).mock.results[0]?.value as typeof logMock;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redis.llen).mockResolvedValue(0);
    vi.mocked(redis.set).mockResolvedValue('OK');
    vi.mocked(redis.eval).mockResolvedValue(1);
    vi.mocked(redis.incr).mockResolvedValue(1);
    vi.mocked(applySanityRules).mockReturnValue({ valid: true });
  });

  it('retorna "empty" quando a queue está vazia', async () => {
    vi.mocked(redis.rpoplpush).mockResolvedValueOnce(null);

    const status = await processOneTelemetryEvent();

    expect(status).toBe('empty');
    expect(redis.rpoplpush).toHaveBeenCalledWith('telemetry_queue', 'telemetry_processing_queue');
  });

  it('processa evento válido: RPOPLPUSH + strapiPost + LREM chamados, retorna "processed"', async () => {
    vi.mocked(redis.rpoplpush).mockResolvedValueOnce(JSON.stringify(mockEvent));
    vi.mocked(strapiPost).mockResolvedValueOnce({ data: { id: 1 }, meta: {} });

    const status = await processOneTelemetryEvent();

    expect(status).toBe('processed');
    expect(redis.rpoplpush).toHaveBeenCalledWith('telemetry_queue', 'telemetry_processing_queue');
    expect(strapiPost).toHaveBeenCalledWith('/telemetrias', expect.objectContaining({
      eventId: 'evt-123',
      dados: { foo: 'bar' },
      perfil: 'perfil-456',
    }));
    expect(redis.lrem).toHaveBeenCalledWith('telemetry_processing_queue', 1, JSON.stringify(mockEvent));
  });

  it('retorna "duplicate" quando evento já foi processado: strapiPost não chamado, LREM chamado', async () => {
    vi.mocked(redis.rpoplpush).mockResolvedValueOnce(JSON.stringify(mockEvent));
    vi.mocked(redis.set).mockResolvedValueOnce(null); // NX já existe → duplicado

    const status = await processOneTelemetryEvent();

    expect(status).toBe('duplicate');
    expect(strapiPost).not.toHaveBeenCalled();
    expect(redis.lrem).toHaveBeenCalledWith('telemetry_processing_queue', 1, JSON.stringify(mockEvent));
  });

  it('retorna "cold" quando sanity é inválida: LREM chamado, strapiPost não chamado', async () => {
    vi.mocked(redis.rpoplpush).mockResolvedValueOnce(JSON.stringify(mockEvent));
    vi.mocked(applySanityRules).mockReturnValueOnce({ valid: false, reason: 'Score too high' });

    const status = await processOneTelemetryEvent();

    expect(status).toBe('cold');
    expect(strapiPost).not.toHaveBeenCalled();
    expect(redis.lrem).toHaveBeenCalledWith('telemetry_processing_queue', 1, JSON.stringify(mockEvent));
  });

  it('move imediatamente para DLQ se JSON.parse falhar (poison pill)', async () => {
    const invalidRaw = 'invalid-json';
    vi.mocked(redis.rpoplpush).mockResolvedValueOnce(invalidRaw);

    const status = await processOneTelemetryEvent();

    expect(status).toBe('error');
    // moveToDlq agora guarda envelope JSON, não o raw string directamente
    expect(redis.lpush).toHaveBeenCalledWith('telemetry_dlq', expect.any(String));
    expect(redis.lrem).toHaveBeenCalledWith('telemetry_processing_queue', 1, invalidRaw);
    expect(Sentry.captureMessage).toHaveBeenCalledWith('telemetry-poison-pill', expect.anything());
  });

  it('re-enfileira para retry e liberta lock se falhar com retries < limite', async () => {
    vi.mocked(redis.rpoplpush).mockResolvedValueOnce(JSON.stringify(mockEvent));
    vi.mocked(strapiPost).mockRejectedValueOnce(new Error('Strapi Down'));
    vi.mocked(redis.eval).mockResolvedValueOnce(3); // Retry 3 de 5

    const status = await processOneTelemetryEvent();

    expect(status).toBe('error');
    expect(redis.del).toHaveBeenCalledWith('tel:evt:evt-123'); // Lock libertado para retry
    expect(redis.lrem).toHaveBeenCalledWith('telemetry_processing_queue', 1, JSON.stringify(mockEvent));
    expect(redis.rpush).toHaveBeenCalledWith('telemetry_queue', JSON.stringify(mockEvent)); // De volta ao fim da fila
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('move para DLQ e alerta Sentry no 5º retry (retries >= RETRY_LIMIT)', async () => {
    vi.mocked(redis.rpoplpush).mockResolvedValueOnce(JSON.stringify(mockEvent));
    vi.mocked(strapiPost).mockRejectedValueOnce(new Error('Persistent Error'));
    vi.mocked(redis.eval).mockResolvedValueOnce(5); // 5 >= 5 → DLQ (off-by-one corrigido)

    const status = await processOneTelemetryEvent();

    expect(status).toBe('error');
    expect(redis.lpush).toHaveBeenCalledWith('telemetry_dlq', expect.any(String));
    expect(Sentry.captureMessage).toHaveBeenCalledWith('telemetry-poison-pill', expect.objectContaining({
      extra: expect.objectContaining({ eventId: 'evt-123' }) as Record<string, unknown>,
    }));
  });

  it('chama clearRetries em sucesso quando eventId existe', async () => {
    vi.mocked(redis.rpoplpush).mockResolvedValueOnce(JSON.stringify(mockEvent));
    vi.mocked(strapiPost).mockResolvedValueOnce({ data: { id: 1 }, meta: {} });

    const status = await processOneTelemetryEvent();

    expect(status).toBe('processed');
    expect(redis.del).toHaveBeenCalledWith('tel:retry:evt-123');
  });

  it('não re-enfileira nem envia para DLQ quando clearRetries falha após persistência bem-sucedida', async () => {
    vi.mocked(redis.rpoplpush).mockResolvedValueOnce(JSON.stringify(mockEvent));
    vi.mocked(strapiPost).mockResolvedValueOnce({ data: { id: 1 }, meta: {} });
    vi.mocked(redis.del).mockRejectedValueOnce(new Error('Redis del failed'));

    const status = await processOneTelemetryEvent();

    expect(status).toBe('processed');
    expect(redis.lpush).not.toHaveBeenCalledWith('telemetry_queue', expect.anything());
    expect(redis.lpush).not.toHaveBeenCalledWith('telemetry_dlq', expect.anything());
    expect(redis.lrem).toHaveBeenCalledWith('telemetry_processing_queue', 1, JSON.stringify(mockEvent));
  });

  it('emite backpressure warning quando llen > 10_000', async () => {
    vi.mocked(redis.llen).mockResolvedValueOnce(10001);
    vi.mocked(redis.rpoplpush).mockResolvedValueOnce(null);

    const status = await processOneTelemetryEvent();

    expect(redis.llen).toHaveBeenCalledWith('telemetry_queue');
    expect(logMock.warn).toHaveBeenCalledWith(
      { queueLen: 10001 },
      expect.stringContaining('10k'),
    );
    expect(status).toBe('empty');
  });
});
