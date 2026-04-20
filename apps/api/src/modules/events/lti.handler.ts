import pino from 'pino';
import { redis } from '../../lib/redis.js';
import { ltiScoreService, type LtiScoreResult } from '../lti/lti.score.service.js';
import type { DomainEvent } from './types.js';

const log = pino({ name: 'lti-handler' });

const LOCK_PREFIX = 'lock:lti:';

async function acquireLock(tentativaId: string): Promise<boolean> {
  const lockKey = `${LOCK_PREFIX}${tentativaId}`;
  // Lock de 30s para garantir que o envio externo (lento) não seja duplicado
  const acquired = await redis.set(lockKey, '1', { nx: true, px: 30000 });
  return acquired === 'OK';
}

async function releaseLock(tentativaId: string) {
  await redis.del(`${LOCK_PREFIX}${tentativaId}`);
}

/**
 * Handler LTI Grade Passback (Sovereign Implementation)
 * Protegido por RedLock e integrado com Outbox Pattern.
 */
export async function ltiHandler(event: DomainEvent<{ tentativaId: string; score: number; perfilId: string }>): Promise<LtiScoreResult | void> {
  const { tentativaId, score, perfilId } = event.payload;

  // 1. RedLock: Garantia de Exclusividade Absoluta
  const hasLock = await acquireLock(tentativaId);
  if (!hasLock) {
    log.info({ tentativaId }, 'Envio LTI já em curso noutro worker. Ignorado.');
    return;
  }

  try {
    // 2. Idempotência Secundária (Redis SADD)
    const isNew = await redis.sadd(`lti_score_sent:${tentativaId}`, '1').catch(() => 1);
    if (isNew === 0) {
      log.info({ tentativaId }, 'Score LTI já processado anteriormente.');
      return;
    }
    await redis.expire(`lti_score_sent:${tentativaId}`, 86400).catch(() => {});

    // 3. Chama adapter real para o LMS externo
    const result = await ltiScoreService.sendScoreFromContext(perfilId, tentativaId, score);
    
    if (result.status === 'sent') {
      log.info({ perfilId, tentativaId, score }, 'Score LTI entregue com sucesso.');
    } else if (result.status === 'skipped') {
      log.info({ perfilId, tentativaId, reason: result.reason }, `LTI Skip: ${result.status}`);
    } else {
      log.warn({ perfilId, tentativaId, reason: result.reason }, 'LTI Fail: Erro reprocessável');
      // Lançamos erro para o Outbox Worker saber que deve tentar novamente com backoff
      throw new Error(`LTI Passback failed: ${result.status}`);
    }
    
    return result;
  } catch (err) {
    // Se falhar, removemos do SADD para permitir retry (ou confiamos no RedLock TTL)
    await redis.del(`lti_score_sent:${tentativaId}`).catch(() => {});
    log.error({ err, perfilId, tentativaId }, 'Falha no envio de score LTI');
    throw err;
  } finally {
    // IMPORTANTE: Não libertamos o lock imediatamente se houver risco de race condition 
    // em retries ultra-rápidos, mas aqui o TTL de 30s protege.
    await releaseLock(tentativaId);
  }
}
