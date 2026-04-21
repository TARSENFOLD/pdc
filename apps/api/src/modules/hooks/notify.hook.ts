import { 
  type EcosystemHook, 
  EcosystemHookName, 
  type DomainEvent, 
  type EcosystemHookResult,
  type EcosystemHookContext,
  type BaseDomainEventPayload
} from '@pdc/shared';
import { socketService } from '../realtime/socket.service.js';
import { strapiPost } from '../strapi/strapi.client.js';
import pino from 'pino';

const log = pino({ name: 'notify-hook' });

export const notifyHook: EcosystemHook = {
  name: EcosystemHookName.NOTIFY,
  dependencies: [
    EcosystemHookName.RANKING, 
    EcosystemHookName.FEED, 
    EcosystemHookName.MATCH, 
    EcosystemHookName.ACHIEVEMENT
  ],
  
  idempotencyKey: (event) => `notify:${event.id}`,

  execute: async (event: DomainEvent<BaseDomainEventPayload>, context: EcosystemHookContext): Promise<EcosystemHookResult> => {
    const payload = event.payload;
    const { results } = context;

    // 1. Processar Conquistas (Hook 4)
    const achievementResult = results[EcosystemHookName.ACHIEVEMENT];
    if (achievementResult?.status === 'sent' && achievementResult.data?.desbloqueadas) {
      const { userId, desbloqueadas } = achievementResult.data as { userId: string; desbloqueadas: unknown[] };
      desbloqueadas.forEach((conquista) => {
        socketService.emitirConquista(userId, conquista);
      });
    }

    // 2. Persistir Notificação no Strapi (Audit Trail)
    const perfilId = payload.perfilId || payload.autorId || payload.userId;
    if (perfilId) {
      try {
        await strapiPost<unknown>('/notificacoes', {
          perfil: String(perfilId),
          tipo: 'sistema',
          titulo: 'Actividade Processada',
          corpo: `O teu evento ${event.name} foi integrado no ecossistema.`,
          eventId: event.id,
          lida: false
        });
      } catch (err) {
        log.error({ err }, 'Falha ao persistir log de notificação');
      }
    }

    return { status: 'sent' };
  }
};
