import pino from 'pino';
import { strapiGet } from '../strapi/strapi.client.js';
import { redis } from '../../lib/redis.js';
import { ltiScoreService } from '../lti/lti.score.service.js';
import { type LtiScoreResult, type SubscricaoLti } from '@pdc/shared';
import { EventPayloadSchemas } from '@pdc/shared';
import type { DomainEvent } from './types.js';

const LtiEventPayloadSchema = EventPayloadSchemas.LTI_PASSBACK || EventPayloadSchemas.LTI_GRADE_PASSBACK || EventPayloadSchemas.LTI_SCORE_PASSBACK || EventPayloadSchemas.LTI_PASSBACK_REQ || EventPayloadSchemas.LTI_SYNC;

const log = pino({ name: 'lti-handler' });

/**
 * LTI Grade Passback Handler
 * Sincroniza scores do PDC para o LMS original via LTI 1.3.
 */
export async function ltiHandler(event: DomainEvent): Promise<LtiScoreResult> {
  const parsed = LtiEventPayloadSchema?.safeParse(event.payload) || { success: true, data: event.payload as any };

  if (!parsed.success) {
    log.warn({ eventId: event.id, errors: parsed.error.flatten() }, 'Payload LTI incompleto');
    return { status: 'skipped', reason: 'incomplete-payload' };
  }

  const { tentativaId, score, perfilId } = parsed.data;

  // Idempotência via Redis
  const lockKey = `lti:sync:${tentativaId}`;
  const isNew = await redis.set(lockKey, 'syncing', { ex: 60, nx: true });
  if (!isNew) return { status: 'skipped', reason: 'already-syncing' };

  try {
    log.info({ tentativaId, score }, 'A iniciar sync LTI...');
    
    // 1. Procurar subscrição LTI vinculada
    const res = await strapiGet<SubscricaoLti>('/subscricoes', {
      'filters[perfil][id][$eq]': perfilId,
      'filters[tipo][$eq]': 'lti'
    });

    if (res.data.length === 0) {
      log.debug({ perfilId }, 'Perfil não tem subscrição LTI activa');
      return { status: 'skipped', reason: 'no-lti-subscription' };
    }

    // 2. Handshake LTI 1.3 real com o LMS via Service
    const result = await ltiScoreService.sendScoreFromContext(perfilId, tentativaId, score);

    if (result.status === 'retryable_error') {
       throw new Error(`LTI Passback failed: retryable_error (${result.reason || 'unknown'})`);
    }

    await redis.del(lockKey);
    return result;

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: msg, eventId: event.id }, 'Erro no LTI Sync');
    await redis.del(lockKey);
    throw err;
  }
}
