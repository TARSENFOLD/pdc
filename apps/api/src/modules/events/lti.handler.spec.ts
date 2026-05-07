import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ltiHandler } from './lti.handler.js';
import { redis } from '../../lib/redis.js';
import { DomainEventName } from '@pdc/shared';
import { ltiScoreService } from '../lti/lti.score.service.js';
import { type LtiScoreResult, type StrapiListResponse } from '@pdc/shared';
import { strapiGet } from '../strapi/strapi.client.js';

function listResponse<T>(data: Array<T & { id: string | number }>): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

// Mocks
vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
}));

vi.mock('../../lib/redis.js', () => ({
  redis: {
    set: vi.fn(),
    del: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock('../lti/lti.score.service.js', () => ({
  ltiScoreService: {
    sendScoreFromContext: vi.fn(),
  },
}));

describe('LTI Handler (Passback real)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sendScoreMock = vi.mocked(ltiScoreService.sendScoreFromContext);

  const event = {
    id: 'evt-1',
    name: DomainEventName.TENTATIVA_CONCLUIDA,
    payload: { tentativaId: 'tent-123', score: 0.85, perfilId: 'perf-456' },
    timestamp: new Date().toISOString(),
  };

  it('deve enviar score para o LMS via service (Happy Path)', async () => {
    vi.mocked(redis.set).mockResolvedValueOnce('OK'); // Novo evento
    
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 'sub-1' }]));

    sendScoreMock.mockResolvedValueOnce({ status: 'sent' } as LtiScoreResult);

    await ltiHandler(event);

    expect(sendScoreMock).toHaveBeenCalledWith(
      'perf-456',
      'tent-123',
      0.85
    );
  });

  it('deve ignorar eventos duplicados (Idempotência Redis)', async () => {
    vi.mocked(redis.set).mockResolvedValueOnce(null); // Já processado (NX falhou)

    await ltiHandler(event);

    expect(sendScoreMock).not.toHaveBeenCalled();
  });

  it('deve retornar "skipped" se perfil não tiver subscrição LTI activa', async () => {
    vi.mocked(redis.set).mockResolvedValueOnce('OK');
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([])); // Sem subscrição

    const result = await ltiHandler(event);
    expect(result).toEqual({ status: 'skipped', reason: 'no-lti-subscription' });
  });

  it('deve lançar erro se o status for "retryable_error" (Para manter processed=false)', async () => {
    vi.mocked(redis.set).mockResolvedValueOnce('OK');
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{ id: 'sub-1' }]));

    sendScoreMock.mockResolvedValueOnce({
      status: 'retryable_error', 
      reason: 'token-failure' 
    } as LtiScoreResult);

    await expect(ltiHandler(event)).rejects.toThrow('LTI Passback failed: retryable_error (token-failure)');
  });

  it('deve propagar erro se o envio para o LMS falhar (Crash)', async () => {
    vi.mocked(redis.set).mockResolvedValueOnce('OK');
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{ id: 'sub-1' }]));
      
    sendScoreMock.mockRejectedValueOnce(new Error('LMS Timeout'));

    await expect(ltiHandler(event)).rejects.toThrow('LMS Timeout');
  });

  it('não deve apagar o lock em caso de erro (backoff via TTL)', async () => {
    vi.mocked(redis.set).mockResolvedValueOnce('OK');
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{ id: 'sub-1' }]));
    sendScoreMock.mockRejectedValueOnce(new Error('LMS Timeout'));

    await expect(ltiHandler(event)).rejects.toThrow();

    // Lock deve permanecer — TTL de 60s garante backoff implícito
    expect(vi.mocked(redis.del)).not.toHaveBeenCalled();
  });
});
