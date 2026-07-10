import { 
  type EcosystemHook, 
  EcosystemHookName, 
  type DomainEvent, 
  DomainEventName,
  type EcosystemHookResult,
  type BaseDomainEventPayload
} from '@pdc/shared';
import * as reputationService from '../reputation/reputation.service.js';
import pino from 'pino';

const log = pino({ name: 'ranking-hook' });

async function markManyForRecalculation(perfilIds: Array<string | number | undefined>, motivo: DomainEventName): Promise<void> {
  const uniquePerfilIds = [...new Set(perfilIds
    .filter((perfilId): perfilId is string | number => perfilId !== undefined)
    .map((perfilId) => String(perfilId)))];

  if (uniquePerfilIds.length === 0) {
    throw new Error('autorId-missing-in-payload');
  }

  await Promise.all(uniquePerfilIds.map((perfilId) => reputationService.marcarParaRecalculo(perfilId, motivo)));
}

export const rankingHook: EcosystemHook = {
  name: EcosystemHookName.RANKING,
  dependencies: [],
  
  idempotencyKey: (event) => `ranking:${event.id}`,

  execute: async (event: DomainEvent<BaseDomainEventPayload>): Promise<EcosystemHookResult> => {
    const payload = event.payload;
    const meritEvents = [
      DomainEventName.CURSO_PUBLICADO,
      DomainEventName.SIMULACAO_PUBLICADA,
      DomainEventName.EXPERIENCIA_PUBLICADA,
      DomainEventName.PROGRAMA_PUBLICADO,
      DomainEventName.PROJETO_PUBLICADO,
      DomainEventName.POST_PUBLICADO,
      DomainEventName.TENTATIVA_CONCLUIDA,
      DomainEventName.COMENTARIO_CRIADO,
      DomainEventName.LIKE_ADICIONADO,
      DomainEventName.PARTILHA_CRIADA,
      DomainEventName.RATING_CRIADO,
      DomainEventName.VINCULO_APROVADO
    ];

    if (!meritEvents.includes(event.name)) {
      return { status: 'skipped', reason: 'not-a-merit-event' };
    }

    try {
      // Marcar perfil para recálculo de reputação no próximo batch
      if (event.name === DomainEventName.VINCULO_APROVADO) {
        await markManyForRecalculation(
          [payload.solicitanteId as string | number | undefined, payload.destinatarioId as string | number | undefined],
          event.name,
        );
      } else {
        await markManyForRecalculation([payload.autorId, payload.perfilId, payload.userId], event.name);
      }
      
      return { status: 'sent' };
    } catch (err) {
      if (err instanceof Error && err.message === 'autorId-missing-in-payload') {
        return { status: 'fatal_error', reason: 'autorId-missing-in-payload' };
      }
      log.error({ err, eventName: event.name }, 'Falha ao marcar para recalculo');
      return { status: 'retryable_error', reason: 'reputation-service-failed' };
    }
  }
};
