import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ltiHandler } from './lti.handler.js';
import { redis } from '../../lib/redis.js';
import { DomainEventName } from './types.js';
import { ltiScoreService, type LtiScoreResult } from '../lti/lti.score.service.js';

// Mocks
vi.mock('../../lib/redis.js', () => ({
  redis: {
    sadd: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(true),
  },
}));

// Este service ainda não existe, mockamos a interface da Approach §1.4
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
    payload: { tentativaId: 'tent-123', score: 85, perfilId: 'perf-456' },
    timestamp: new Date().toISOString(),
  };

  it('deve enviar score para o LMS via service (Happy Path)', async () => {
    vi.mocked(redis.sadd).mockResolvedValueOnce(1); // Novo evento
    vi.mocked(ltiScoreService.sendScoreFromContext).mockResolvedValueOnce({ status: 'sent' } as LtiScoreResult);

    await ltiHandler(event);

    expect(ltiScoreService.sendScoreFromContext).toHaveBeenCalledWith(
      'perf-456',
      'tent-123',
      85
    );
  });

  it('deve ignorar eventos duplicados (Idempotência Redis)', async () => {
    vi.mocked(redis.sadd).mockResolvedValueOnce(0); // Já processado

    await ltiHandler(event);

    expect(ltiScoreService.sendScoreFromContext).not.toHaveBeenCalled();
  });

  it('deve retornar "skipped" se perfil não tiver contexto LTI (Ack)', async () => {
    vi.mocked(redis.sadd).mockResolvedValueOnce(1);
    vi.mocked(ltiScoreService.sendScoreFromContext).mockResolvedValueOnce({ status: 'skipped', reason: 'no-lti-context' } as LtiScoreResult);

    const result = await ltiHandler(event);
    
    expect(result).toEqual({ status: 'skipped', reason: 'no-lti-context' });
  });

  it('deve lançar erro se o status for "retryable_error" (Para manter processed=false)', async () => {
    vi.mocked(redis.sadd).mockResolvedValueOnce(1);
    vi.mocked(ltiScoreService.sendScoreFromContext).mockResolvedValueOnce({ 
      status: 'retryable_error', 
      reason: 'token-failure' 
    } as LtiScoreResult);

    // O handler deve converter status de erro em excepção para o EventBus capturar
    await expect(ltiHandler(event)).rejects.toThrow('LTI Passback failed: retryable_error (token-failure)');
  });

  it('deve propagar erro se o envio para o LMS falhar (Crash)', async () => {
    vi.mocked(redis.sadd).mockResolvedValueOnce(1);
    vi.mocked(ltiScoreService.sendScoreFromContext).mockRejectedValueOnce(new Error('LMS Timeout'));

    await expect(ltiHandler(event)).rejects.toThrow('LMS Timeout');
  });
});
