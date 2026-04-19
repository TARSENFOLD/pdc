import pino from 'pino';
import { redis } from '../../lib/redis.js';
import { ltiScoreService, type LtiScoreResult } from '../lti/lti.score.service.js';
import type { DomainEvent } from './types.js';

const log = pino({ name: 'lti-handler' });

/**
 * Handler LTI Grade Passback (Refactored R2.T3b)
 * Realiza o envio de notas para o LMS externo se o perfil tiver contexto LTI.
 */
export async function ltiHandler(event: DomainEvent<{ tentativaId: string; score: number; perfilId: string }>): Promise<LtiScoreResult | void> {
  const { tentativaId, score, perfilId } = event.payload;

  // 1. Idempotência: Impedir envio duplo de nota (TTL 24h)
  // Se o Redis falhar, assumimos que é novo para garantir o envio (at-least-once)
  const isNew = await redis.sadd(`lti_score_sent:${tentativaId}`, '1').catch(() => 1);
  if (isNew === 0) {
    log.info({ tentativaId }, 'Score LTI já enviado para esta tentativa. Ignorado.');
    return;
  }
  await redis.expire(`lti_score_sent:${tentativaId}`, 86400).catch(() => {});

  // 2. Chama adapter real
  try {
    const result = await ltiScoreService.sendScoreFromContext(perfilId, tentativaId, score);
    
    if (result.status === 'sent') {
      log.info({ perfilId, tentativaId, score }, 'Score LTI enviado com sucesso.');
    } else if (result.status === 'skipped') {
      log.info({ perfilId, tentativaId, reason: result.reason }, `LTI Skip: ${result.status}`);
    } else {
      // Caso seja 'retryable_error' (Garantido pelo tipo LtiScoreResult)
      log.warn({ perfilId, tentativaId, reason: result.reason }, 'LTI Fail: retryable_error');
      // Converte status de erro em excepção para o EventBus capturar e NÃO marcar como processed
      throw new Error(`LTI Passback failed: ${result.status} (${result.reason || 'unknown'})`);
    }
    
    return result;
  } catch (err) {
    log.error({ err, perfilId, tentativaId }, 'Falha crítica no envio de score LTI');
    // Propagamos erro para o event-bus manter processed=false (retryable)
    throw err;
  }
}
