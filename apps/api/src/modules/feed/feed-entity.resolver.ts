import { DomainEventName, type FeedEventPayload } from '@pdc/shared';

export type FeedEntryType = 'curso' | 'simulacao' | 'experiencia' | 'programa' | 'projeto' | 'post';

const FEED_ENTITY_BY_EVENT: Readonly<Partial<Record<DomainEventName, FeedEntryType>>> = {
  [DomainEventName.CURSO_PUBLICADO]: 'curso',
  [DomainEventName.SIMULACAO_PUBLICADA]: 'simulacao',
  [DomainEventName.EXPERIENCIA_PUBLICADA]: 'experiencia',
  [DomainEventName.PROGRAMA_PUBLICADO]: 'programa',
  [DomainEventName.PROJETO_PUBLICADO]: 'projeto',
  [DomainEventName.POST_PUBLICADO]: 'post',
};

export function resolveFeedEntityType(eventName: DomainEventName): FeedEntryType | null {
  return FEED_ENTITY_BY_EVENT[eventName] ?? null;
}

export function resolveFeedEntityId(payload: FeedEventPayload): string | undefined {
  const raw = payload.cursoId
    ?? payload.simulacaoId
    ?? payload.experienciaId
    ?? payload.projetoId
    ?? payload.postId
    ?? payload.programaId
    ?? payload.id;
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
  return undefined;
}