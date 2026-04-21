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
    const results = context.results;

    // 1. Processar Conquistas (Hook 4)
    const achievementResult = results[EcosystemHookName.ACHIEVEMENT];
    if (achievementResult?.status === 'sent' && achievementResult.data) {
      const { userId, desbloqueadas } = achievementResult.data as { userId: string; desbloqueadas: { slug: string; titulo: string; descricao: string }[] };
      desbloqueadas.forEach((conquista) => {
        socketService.emitirConquista(userId, conquista);
      });
    }

    // 2. Persistir Notificação no Strapi (Audit Trail)
    const pId = payload.perfilId || payload.autorId || payload.userId;
    if (pId) {
      try {
        await strapiPost<unknown>('/notificacoes', {
          perfil: String(pId),
          tipo: 'sistema',
          titulo: 'Actividade Processada',
          corpo: `O teu evento ${event.name} foi integrado no ecossistema.`,
          eventId: event.id,
          lida: false
        });
      } catch (err: unknown) {
        log.error({ err }, 'Falha ao persistir log de notificação');
      }
    }

    return { status: 'sent' };
  }
};
