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

// ── FOMO Triggers (F6 — Spec §3.2 ROADMAP_PRODUTO_DISRUPTIVO) ───────────────

interface FomoPayload {
  perfilId?: string | number;
  autorId?: string | number;
  userId?: string | number;
  destinatarioId?: string | number;
  solicitanteId?: string | number;
  mentorId?: string | number;
  projetoId?: string | number;
  cursoId?: string | number;
  area?: string;
}

async function persistNotificacao(perfilId: string, tipo: string, titulo: string, mensagem: string, eventId: string): Promise<void> {
  try {
    await strapiPost<unknown>('/notificacoes', {
      perfil: perfilId,
      tipo,
      titulo,
      mensagem,
      corpo: mensagem,
      eventId,
      lida: false,
    });
  } catch (err: unknown) {
    log.warn({ err, perfilId, tipo }, 'FOMO: falha ao persistir notificação');
  }
}

async function resolvePerfilIdFromUserId(userId: string | number): Promise<string | undefined> {
  try {
    const res = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': String(userId),
      'fields[0]': 'id',
    });
    return res.data[0]?.id;
  } catch {
    return undefined;
  }
}

async function processFomoTrigger(event: DomainEvent<BaseDomainEventPayload>, payload: FomoPayload): Promise<void> {
  const name = event.name;

  // "Alguém quer conectar contigo" — notifica destinatário do pedido de vínculo
  const ts = new Date().toISOString();

  if (name === DomainEventName.VINCULO_SOLICITADO && payload.destinatarioId) {
    const pId = await resolvePerfilIdFromUserId(payload.destinatarioId);
    if (pId) {
      const msg = 'Alguém quer conectar contigo na plataforma.';
      await persistNotificacao(pId, 'vinculo_pedido', 'Nova solicitação de conexão', msg, event.id);
      socketService.emitirNotificacao(String(payload.destinatarioId), { id: event.id, tipo: 'vinculo_pedido', titulo: 'Nova solicitação de conexão', mensagem: msg, timestamp: ts });
    }
  }

  if (name === DomainEventName.VINCULO_APROVADO && payload.solicitanteId) {
    const pId = await resolvePerfilIdFromUserId(payload.solicitanteId);
    if (pId) {
      const msg = 'A tua solicitação de vínculo foi aceite. A tua rede está a crescer!';
      await persistNotificacao(pId, 'vinculo_aprovado', 'Conexão aceite!', msg, event.id);
      socketService.emitirNotificacao(String(payload.solicitanteId), { id: event.id, tipo: 'vinculo_aprovado', titulo: 'Conexão aceite!', mensagem: msg, timestamp: ts });
    }
  }

  if (name === DomainEventName.MENTORIA_SOLICITADA) {
    const mentorUserId = payload.mentorId ?? payload.destinatarioId;
    if (mentorUserId) {
      const pId = await resolvePerfilIdFromUserId(mentorUserId);
      if (pId) {
        const msg = 'Um estudante quer a tua orientação. Aceitar fortalece a tua reputação!';
        await persistNotificacao(pId, 'info', 'Pedido de mentoria recebido', msg, event.id);
        socketService.emitirNotificacao(String(mentorUserId), { id: event.id, tipo: 'info', titulo: 'Pedido de mentoria recebido', mensagem: msg, timestamp: ts });
      }
    }
  }

  if (name === DomainEventName.PROJETO_ENDORSEMENT_RECEBIDO && payload.autorId) {
    const pId = await resolvePerfilIdFromUserId(payload.autorId);
    if (pId) {
      const msg = 'O teu projeto recebeu um endorsement. O teu trabalho está a ser notado!';
      await persistNotificacao(pId, 'sucesso', 'Talento reconhecido!', msg, event.id);
      socketService.emitirNotificacao(String(payload.autorId), { id: event.id, tipo: 'sucesso', titulo: 'Talento reconhecido!', mensagem: msg, timestamp: ts });
    }
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

    // 2. FOMO triggers — notificações contextuais de urgência/oportunidade
    await processFomoTrigger(event, payload);

    // 3. Resolve real perfil relation id — never persist a raw userId as perfil
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
