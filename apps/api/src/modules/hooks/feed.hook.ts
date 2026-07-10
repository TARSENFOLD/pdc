import { 
  type EcosystemHook, 
  EcosystemHookName, 
  type DomainEvent, 
  DomainEventName,
  type EcosystemHookResult,
  type FeedEventPayload
} from '@pdc/shared';
import { strapiPost } from '../strapi/strapi.client.js';
import { redis } from '../../lib/redis.js';
import pino from 'pino';
import { resolveFeedEntityId, resolveFeedEntityType } from '../feed/feed-entity.resolver.js';

const log = pino({ name: 'feed-hook' });

async function invalidateFeedCache(source: string, area?: string, instituicaoId?: string | number): Promise<void> {
  const institutionalKey = instituicaoId ? `feed:${source}:${String(instituicaoId)}` : `feed:${source}:all`;
  const results = await Promise.allSettled([
    redis.del(institutionalKey),
    redis.del(`feed:${source}:${area ?? 'all'}`),
    redis.del('feed:trending:all'),
  ]);
  for (const r of results) {
    if (r.status === 'rejected') log.warn({ err: r.reason }, 'Falha ao invalidar cache de feed');
  }
}

export const feedHook: EcosystemHook = {
  name: EcosystemHookName.FEED,
  dependencies: [],
  
  idempotencyKey: (event) => `feed:${event.name}:${event.id}`,

  execute: async (event: DomainEvent<FeedEventPayload>): Promise<EcosystemHookResult> => {
    // Apenas eventos de publicação geram feed
    const publishEvents = [
      DomainEventName.CURSO_PUBLICADO,
      DomainEventName.SIMULACAO_PUBLICADA,
      DomainEventName.EXPERIENCIA_PUBLICADA,
      DomainEventName.PROJETO_PUBLICADO,
      DomainEventName.PROGRAMA_PUBLICADO,
      DomainEventName.POST_PUBLICADO
    ];

    if (!publishEvents.includes(event.name)) {
      return { status: 'skipped', reason: 'event-not-eligible-for-feed' };
    }

    const payload = event.payload;
    const autorId = payload.autorId || payload.userId;
    
    try {
      // REGRA G15: Decidir fonte (Institucional vs Vocacional)
      // Se tiver instituicaoId no payload (vindo do BFF), vai para Institucional
      const source = payload.instituicaoId ? 'institucional' : 'vocacional';
      const entityId = resolveFeedEntityId(payload);
      if (!entityId) return { status: 'fatal_error', reason: 'entityId-missing' };
      const entityType = resolveFeedEntityType(event.name);
      if (!entityType) return { status: 'skipped', reason: 'event-not-eligible-for-feed' };
      if (!autorId) {
        log.warn({ eventName: event.name, eventId: event.id }, 'feedHook sem autorId — entrada ignorada');
        return { status: 'fatal_error', reason: 'autorId-missing' };
      }

      await strapiPost<unknown>('/feed-entries', {
        entityType,
        entityId,
        autorId: String(autorId),
        titulo: payload.titulo,
        corpo: payload.descricao || payload.conteudo,
        area: payload.area,
        source,
        instituicaoId: payload.instituicaoId ? String(payload.instituicaoId) : undefined,
        eventId: event.id, // Idempotência via Unique Constraint no Strapi
        publicadoEm: event.timestamp
      });

      await invalidateFeedCache(source, payload.area, payload.instituicaoId);

      return { status: 'sent', data: { source } };
    } catch (err) {
      log.error({ err, eventId: event.id }, 'Falha ao criar entrada de feed');
      return { status: 'retryable_error', reason: 'strapi-post-failed' };
    }
  }
};
