import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ltiHandler } from './lti.handler.js';
import { redis } from '../../lib/redis.js';
import { DomainEventName } from '@pdc/shared';
import { ltiScoreService } from '../lti/lti.score.service.js';
import { type LtiScoreResult } from '@pdc/shared';
import { strapiGet } from '../strapi/strapi.client.js';

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

  const event = {
    id: 'evt-1',
    name: DomainEventName.TENTATIVA_CONCLUIDA,
    payload: { tentativaId: 'tent-123', score: 0.85, perfilId: 'perf-456' },
    timestamp: new Date().toISOString(),
  };

  it('deve enviar score para o LMS via service (Happy Path)', async () => {
    vi.mocked(redis.set).mockResolvedValueOnce('OK'); // Novo evento
    
    vi.mocked(strapiGet)
      .mockResolvedValueOnce({ data: [{ id: 'sub-1' }] } as any);

    vi.mocked(ltiScoreService.sendScoreFromContext).mockResolvedValueOnce({ status: 'sent' } as LtiScoreResult);

    await ltiHandler(event);

    expect(ltiScoreService.sendScoreFromContext).toHaveBeenCalledWith(
      'perf-456',
      'tent-123',
      0.85
    );
  });

  it('deve ignorar eventos duplicados (Idempotência Redis)', async () => {
    vi.mocked(redis.set).mockResolvedValueOnce(null); // Já processado (NX falhou)

    await ltiHandler(event);

    expect(ltiScoreService.sendScoreFromContext).not.toHaveBeenCalled();
  });

  it('deve retornar "skipped" se perfil não tiver subscrição LTI activa', async () => {
    vi.mocked(redis.set).mockResolvedValueOnce('OK');
    vi.mocked(strapiGet).mockResolvedValueOnce({ data: [] } as any); // Sem subscrição

    const result = await ltiHandler(event);
    expect(result).toEqual({ status: 'skipped', reason: 'no-lti-subscription' });
  });

  it('deve lançar erro se o status for "retryable_error" (Para manter processed=false)', async () => {
    vi.mocked(redis.set).mockResolvedValueOnce('OK');
    vi.mocked(strapiGet).mockResolvedValueOnce({ data: [{ id: 'sub-1' }] } as any);

    vi.mocked(ltiScoreService.sendScoreFromContext).mockResolvedValueOnce({ 
      status: 'retryable_error', 
      reason: 'token-failure' 
    } as LtiScoreResult);

    await expect(ltiHandler(event)).rejects.toThrow('LTI Passback failed: retryable_error (token-failure)');
  });

  it('deve propagar erro se o envio para o LMS falhar (Crash)', async () => {
    vi.mocked(redis.set).mockResolvedValueOnce('OK');
    vi.mocked(strapiGet).mockResolvedValueOnce({ data: [{ id: 'sub-1' }] } as any);
      
    vi.mocked(ltiScoreService.sendScoreFromContext).mockRejectedValueOnce(new Error('LMS Timeout'));

    await expect(ltiHandler(event)).rejects.toThrow('LMS Timeout');
  });
});
