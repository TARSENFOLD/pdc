import pino from 'pino';
import { z } from 'zod';
import { strapiGet } from '../strapi/strapi.client.js';
import { redis } from '../../lib/redis.js';
import { ltiScoreService } from '../lti/lti.score.service.js';
import { type LtiScoreResult, type SubscricaoLti } from '@pdc/shared';
import type { DomainEvent } from './types.js';

const log = pino({ name: 'lti-handler' });

const LtiEventPayloadSchema = z.object({
  tentativaId: z.string().min(1),
  score: z.number().min(0).max(1),
  perfilId: z.string().min(1),
});

/**
 * LTI Grade Passback Handler
 * Sincroniza scores do PDC para o LMS original via LTI 1.3.
 */
export async function ltiHandler(event: DomainEvent): Promise<LtiScoreResult> {
  const parsed = LtiEventPayloadSchema.safeParse(event.payload);

  if (!parsed.success) {
    log.warn({ eventId: event.id, errors: parsed.error.flatten() }, 'Payload LTI incompleto');
    return { status: 'skipped', reason: 'incomplete-payload' };
  }

  const { tentativaId, score, perfilId } = parsed.data;

  // Idempotência via Redis
  const lockKey = `pdc:lti:sync:${tentativaId}`;
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

    // Limpar lock apenas no sucesso — em erro o TTL de 60s serve como backoff natural
    await redis.del(lockKey);
    return result;

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: msg, eventId: event.id }, 'Erro no LTI Sync');
    // Não apagar lock aqui — TTL expira em 60s, impedindo retry imediato
    throw err;
  }
}
