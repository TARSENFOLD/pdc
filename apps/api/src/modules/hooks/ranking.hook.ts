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
      DomainEventName.PROJETO_PUBLICADO,
      DomainEventName.POST_PUBLICADO,
      DomainEventName.TENTATIVA_CONCLUIDA,
      DomainEventName.COMENTARIO_CRIADO,
      DomainEventName.LIKE_ADICIONADO
    ];

    if (!meritEvents.includes(event.name as DomainEventName)) {
      return { status: 'skipped', reason: 'not-a-merit-event' };
    }

    const autorId = payload.autorId || payload.perfilId || payload.userId;

    if (!autorId) {
      return { status: 'fatal_error', reason: 'autorId-missing-in-payload' };
    }

    try {
      // Marcar perfil para recálculo de reputação no próximo batch
      await reputationService.marcarParaRecalculo(String(autorId), event.name);
      
      return { status: 'sent' };
    } catch (err) {
      log.error({ err, autorId }, 'Falha ao marcar para recalculo');
      return { status: 'retryable_error', reason: 'reputation-service-failed' };
    }
  }
};
