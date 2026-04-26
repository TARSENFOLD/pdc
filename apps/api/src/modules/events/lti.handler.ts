import pino from 'pino';
import { strapiGet } from '../strapi/strapi.client.js';
import { redis } from '../../lib/redis.js';
import type { DomainEvent } from './types.js';

const log = pino({ name: 'lti-handler' });

export interface LtiScoreResult {
  success: boolean;
  message?: string;
}

/**
 * LTI Grade Passback Handler
 * Sincroniza scores do PDC para o LMS original via LTI 1.3.
 */
export async function ltiHandler(event: DomainEvent): Promise<LtiScoreResult | void> {
  const payload = event.payload as { tentativaId: string; score: number; perfilId: string };
  const { tentativaId, score, perfilId } = payload;

  if (!tentativaId || score === undefined || !perfilId) {
    log.warn({ eventId: event.id }, 'Payload LTI incompleto');
    return;
  }

  // Idempotência via Redis
  const lockKey = `lti:sync:${tentativaId}`;
  const isNew = await redis.set(lockKey, 'syncing', { ex: 60, nx: true });
  if (!isNew) return;

  try {
    log.info({ tentativaId, score }, 'A iniciar sync LTI...');
    
    // 1. Procurar subscrição LTI vinculada
    const res = await strapiGet<unknown>('/subscricoes', {
      'filters[perfil][id][$eq]': perfilId,
      'filters[tipo][$eq]': 'lti'
    });

    if (res.data.length === 0) {
      log.debug({ perfilId }, 'Perfil não tem subscrição LTI activa');
      return;
    }

    // TODO: Implementar handshake LTI 1.3 real com o LMS
    // Este é um placeholder para a lógica de grade passback
    log.info({ target: 'LMS External' }, 'Grade Passback simulado com sucesso');

    return { success: true };

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: msg, eventId: event.id }, 'Erro no LTI Sync');
    await redis.del(lockKey);
    throw err;
  }
}
