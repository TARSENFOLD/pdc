import { 
  type EcosystemHook, 
  EcosystemHookName, 
  type DomainEvent, 
  DomainEventName,
  type EcosystemHookResult,
  type FeedEventPayload
} from '@pdc/shared';
import { strapiPost } from '../strapi/strapi.client.js';
import pino from 'pino';

const log = pino({ name: 'feed-hook' });

function resolveEntityId(payload: FeedEventPayload): string | undefined {
  const raw = payload.cursoId ?? payload.simulacaoId ?? payload.experienciaId ?? payload.projetoId ?? payload.postId ?? payload.programaId ?? payload.id;
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
  return undefined;
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
      const entityId = resolveEntityId(payload);
      if (!entityId) return { status: 'fatal_error', reason: 'entityId-missing' };

      await strapiPost<unknown>('/feed-entries', {
        entityType: event.name.split('.')[0], // 'curso', 'simulacao', etc
        entityId,
        autorId: String(autorId),
        titulo: payload.titulo,
        corpo: payload.descricao || payload.conteudo,
        area: payload.area,
        source,
        eventId: event.id, // Idempotência via Unique Constraint no Strapi
        publicadoEm: event.timestamp
      });

      return { status: 'sent', data: { source } };
    } catch (err) {
      log.error({ err, eventId: event.id }, 'Falha ao criar entrada de feed');
      return { status: 'retryable_error', reason: 'strapi-post-failed' };
    }
  }
};
