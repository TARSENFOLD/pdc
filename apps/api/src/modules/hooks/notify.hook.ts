import { 
  type EcosystemHook, 
  EcosystemHookName, 
  type DomainEvent, 
  DomainEventName,
  type EcosystemHookResult,
  type EcosystemHookContext,
  type BaseDomainEventPayload
} from '@pdc/shared';
import { socketService } from '../realtime/socket.service.js';
import { strapiPost, strapiGet } from '../strapi/strapi.client.js';
import pino from 'pino';

const log = pino({ name: 'notify-hook' });

async function resolvePerfilId(payload: BaseDomainEventPayload): Promise<string | undefined> {
  if (payload.perfilId) return String(payload.perfilId);

  const lookupUserId = payload.autorId || payload.userId;
  if (!lookupUserId) return undefined;

  try {
    const res = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': String(lookupUserId),
      'fields[0]': 'id',
    });
    const id = res.data[0]?.id;
    return id ?? undefined;
  } catch (err: unknown) {
    log.warn({ err, lookupUserId }, 'Falha ao resolver perfilId via userId');
    return undefined;
  }
}

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

    // 1. Processamento de Chat (G13 - Realtime Fanout)
    if (event.name === DomainEventName.MENSAGEM_ENVIADA) {
      const msgPayload = payload as { 
        mensagemId: string; 
        destinatarioId: string; 
        remetenteId: string; 
        conteudo: string; 
        conversaId: string;
        createdAt: string;
      };
      
      socketService.emitirMensagem(msgPayload.destinatarioId, {
        id: msgPayload.mensagemId,
        conversaId: msgPayload.conversaId,
        remetenteId: msgPayload.remetenteId,
        conteudo: msgPayload.conteudo,
        createdAt: msgPayload.createdAt,
      });

      log.info({ destinatarioId: msgPayload.destinatarioId }, 'G13: Fanout Realtime executado para Mensagem');
      return { status: 'sent' }; // O chat para aqui (não cria audit trail default)
    }

    // 2. Resolve real perfil relation id — never persist a raw userId as perfil
    const pId = await resolvePerfilId(payload);
    if (!pId) {
      log.warn({ eventName: event.name }, 'perfilId não resolvido — persistência de notificação ignorada (best-effort)');
    }

    // 3. Processar Conquistas (Hook 4)
    const achievementResult = EcosystemHookName.ACHIEVEMENT in results
      ? results[EcosystemHookName.ACHIEVEMENT]
      : undefined;
    
    if (achievementResult?.status === 'sent' && achievementResult.data) {
      const { userId, desbloqueadas } = achievementResult.data as { userId: string; desbloqueadas: { slug: string; titulo: string; descricao: string }[] };
      
      await Promise.allSettled(desbloqueadas.map(async (conquista) => {
        // 1. Fanout Realtime
        socketService.emitirConquista(userId, conquista);
        
        // 2. Persistência de Notificação de Conquista
        if (pId) {
          await strapiPost<unknown>('/notificacoes', {
            perfil: pId,
            tipo: 'conquista',
            titulo: `Conquista Desbloqueada: ${conquista.titulo}`,
            mensagem: conquista.descricao, // Novo schema Strapi (obrigatório)
            corpo: conquista.descricao, // Retrocompatibilidade
            eventId: event.id,
            lida: false
          }).catch((err: unknown) => {
            log.error({ err }, 'Falha ao persistir notificação de conquista');
          });
        }
      }));
    }

    // 4. Persistir Notificação no Strapi (Audit Trail)
    if (pId) {
      try {
        const mensagemAudit = `O teu evento ${event.name} foi integrado no ecossistema.`;
        await strapiPost<unknown>('/notificacoes', {
          perfil: pId,
          tipo: 'sucesso', // Semântica real para o audit trail de sucesso
          titulo: 'Actividade Processada',
          mensagem: mensagemAudit, // Novo schema Strapi (obrigatório)
          corpo: mensagemAudit, // Retrocompatibilidade
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
