import { createHash } from 'node:crypto';
import pino from 'pino';
import { DomainEventName } from '@pdc/shared';
import type { LockHandle } from '../../lib/distributed-lock.js';
import { strapiGet } from '../strapi/strapi.client.js';
import { eventBus } from '../events/event-bus.js';

const log = pino({ name: 'experiencias:recovery' });

export async function releaseExperienceLock(lock: Pick<LockHandle, 'release'>) {
  try {
    await lock.release();
  } catch (err) {
    // The write already finished. Redis TTL releases the lease if cleanup fails.
    log.error({ err }, 'Falha ao libertar lock de experiência; aguardar TTL');
  }
}

// A stable UUID lets retry/read-back repair the outbox without duplicating hooks.
// Call while holding the participation lock. Never include private work in events.
export async function ensureParticipationEvent(
  experienciaId: string,
  estudanteId: string,
  participationId: string,
  concluido = false
) {
  const name = concluido
    ? DomainEventName.EXPERIENCIA_PROGRESSO
    : DomainEventName.EXPERIENCIA_PARTICIPACAO;
  const hash = createHash('sha256')
    .update(JSON.stringify([name, participationId]))
    .digest('hex');
  const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  const persisted = async () =>
    (
      await strapiGet('/domain-events', {
        'filters[correlationId][$eq]': id,
        'filters[name][$eq]': name,
        'pagination[pageSize]': '1',
      })
    ).data.length > 0;
  if (await persisted()) return;
  try {
    await eventBus.publishWithOutbox(
      name,
      {
        experienciaId,
        estudanteId,
        ...(concluido ? { concluido: true } : {}),
      },
      id
    );
  } catch (err) {
    // A lost response after persistence is safe: the durable outbox owns retries.
    if (await persisted()) {
      log.warn({ err, eventId: id }, 'Evento persistido; recuperação delegada ao outbox');
      return;
    }
    throw err;
  }
}
