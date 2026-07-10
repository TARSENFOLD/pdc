import pino from 'pino';
import type { DomainEvent } from './types.js';
import type { FeedEventPayload } from '@pdc/shared';
import { strapiGet, strapiPost } from '../strapi/strapi.client.js';
import { resolveFeedEntityId, resolveFeedEntityType } from '../feed/feed-entity.resolver.js';

const log = pino({ name: 'feed-handler' });

type LegacyFeedPayload = FeedEventPayload & {
  cursoId?: string | number;
  simulacaoId?: string | number;
  experienciaId?: string | number;
  projetoId?: string | number;
  programaId?: string | number;
  postId?: string | number;
  id?: string | number;
};

async function feedEntryExists(eventId: string): Promise<boolean> {
  const existing = await strapiGet<unknown>('/feed-entries', {
    'filters[eventId][$eq]': eventId,
    'pagination[pageSize]': '1',
  });
  return existing.data.length > 0;
}

function isLegacyFeedPayload(payload: unknown): payload is LegacyFeedPayload {
  // LegacyFeedPayload estende BaseDomainEventPayload (index signature [key: string]:
  // unknown + campos opcionais), pelo que qualquer objecto nao-null e nao-array
  // satisfaz o tipo. Type-guard estrutural em vez de cast cego (CONSTITUICAO §2.1).
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload);
}

/**
 * Feed Integration Handler
 * @deprecated Substituído pelo feedHook (G15). Mantido apenas como ponte
 * compatível para chamadas legadas. Não cria mais /posts automáticos porque
 * isso duplicava feed em replay; grava a collection canónica /feed-entries.
 */
export async function feedHandler(event: DomainEvent): Promise<void> {
  if (!isLegacyFeedPayload(event.payload)) {
    log.warn({ eventId: event.id }, 'feedHandler legado ignorou payload inválido');
    return;
  }
  const payload = event.payload;

  try {
    const entityType = resolveFeedEntityType(event.name);
    if (!entityType) {
      log.info({ eventName: event.name, eventId: event.id }, 'Evento ignorado pelo feedHandler legado');
      return;
    }

    const entityId = resolveFeedEntityId(payload);
    if (!entityId) {
      log.warn({ eventName: event.name, eventId: event.id }, 'feedHandler legado sem entityId');
      return;
    }

    if (await feedEntryExists(event.id)) {
      log.info({ eventId: event.id, entityType, entityId }, 'feedHandler legado ignorou replay idempotente');
      return;
    }

    const autorId = String(payload.autorId ?? payload.userId ?? '');
    if (!autorId) {
      log.warn({ eventName: event.name, eventId: event.id }, 'feedHandler legado sem autorId');
      return;
    }

    const source = payload.instituicaoId ? 'institucional' : 'vocacional';
    await strapiPost('/feed-entries', {
      entityType,
      entityId,
      autorId,
      titulo: payload.titulo,
      corpo: payload.descricao ?? payload.conteudo,
      area: payload.area,
      source,
      instituicaoId: payload.instituicaoId ? String(payload.instituicaoId) : undefined,
      eventId: event.id,
      publicadoEm: event.timestamp,
    });

  } catch (err: unknown) {
    log.error({ err, eventId: event.id }, 'Falha ao propagar evento para feed-entry canónico');
  }
}
