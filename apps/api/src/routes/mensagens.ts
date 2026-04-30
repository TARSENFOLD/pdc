import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';

type Vars = { Variables: AuthVariables };

const criarConversaSchema = z.object({
  destinatarioId: z.string().min(1),
});

const enviarMensagemSchema = z.object({
  conteudo: z.string().min(1).max(2000),
});

const mensagensQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

interface StrapiParticipante {
  id: string;
  nome: string;
}

interface StrapiMensagem {
  id: string;
  conteudo: string;
  lida: boolean;
  remetenteId: string;
  createdAt: string;
}

interface StrapiConversa {
  id: string;
  participant1Id: string;
  participant2Id: string;
  participant1?: StrapiParticipante;
  participant2?: StrapiParticipante;
  ultimaMensagem?: { id: string; conteudo: string };
  mensagens?: StrapiMensagem[];
  updatedAt: string;
}

export const mensagensRoutes = new Hono<Vars>();

mensagensRoutes.use('*', verifyJwt);

// GET /mensagens/conversas
mensagensRoutes.get('/conversas', zValidator('query', mensagensQuerySchema), async (c) => {
  const { id: userId } = c.get('user');
  const { page, pageSize } = c.req.valid('query');

  try {
    // Fix: StrapiListResponse is already applied by the client.
    const res = await strapiGet<StrapiConversa>('/conversas', {
      'filters[$or][0][participant1Id][$eq]': userId,
      'filters[$or][1][participant2Id][$eq]': userId,
      'pagination[page]': page.toString(),
      'pagination[pageSize]': pageSize.toString(),
      populate: 'ultimaMensagem,participant1,participant2,mensagens',
      sort: 'updatedAt:desc',
    });

    const conversas = res.data.map((conv) => {
      const outroParticipante =
        conv.participant1Id === userId ? conv.participant2 : conv.participant1;
      return {
        id: conv.id,
        interlocutorId: outroParticipante?.id,
        interlocutorNome: outroParticipante?.nome,
        ultimaMensagem: conv.ultimaMensagem?.conteudo,
        naoLidas: conv.mensagens?.filter(
          (m: StrapiMensagem) => !m.lida && m.remetenteId !== userId
        ).length ?? 0,
        updatedAt: conv.updatedAt,
      };
    });

    return c.json({
      data: conversas,
      meta: res.meta,
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// POST /mensagens/conversas
mensagensRoutes.post(
  '/conversas',
  zValidator('json', criarConversaSchema),
  async (c) => {
    const { id: userId } = c.get('user');
    const { destinatarioId } = c.req.valid('json');

    try {
      if (userId === destinatarioId) {
        return c.json({ error: 'Não podes criar conversa contigo próprio' }, 400);
      }

      const vinculoData = await strapiGet<{ id: string }>('/vinculos', {
        'filters[$or][0][senderId][$eq]': userId,
        'filters[$or][0][receiverId][$eq]': destinatarioId,
        'filters[$or][0][estado][$eq]': 'connected',
        'filters[$or][1][senderId][$eq]': destinatarioId,
        'filters[$or][1][receiverId][$eq]': userId,
        'filters[$or][1][estado][$eq]': 'connected',
        'pagination[pageSize]': '1',
      });

      if (vinculoData.data.length === 0) {
        return c.json({ error: 'Só podes enviar mensagens a vínculos confirmados' }, 403);
      }

      const conversaExistente = await strapiGet<StrapiConversa>('/conversas', {
        'filters[$or][0][participant1Id][$eq]': userId,
        'filters[$or][0][participant2Id][$eq]': destinatarioId,
        'filters[$or][1][participant1Id][$eq]': destinatarioId,
        'filters[$or][1][participant2Id][$eq]': userId,
        'pagination[pageSize]': '1',
      });

      if (conversaExistente.data.length > 0) {
        return c.json(conversaExistente.data[0], 200);
      }

      const resNova = await strapiPost<StrapiConversa>('/conversas', {
        participant1Id: userId,
        participant2Id: destinatarioId,
        ultimaMensagem: null,
      });

      return c.json(resNova.data, 201);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

// GET /mensagens/conversas/:conversaId
mensagensRoutes.get('/conversas/:conversaId', zValidator('query', mensagensQuerySchema), async (c) => {
  const conversaId = c.req.param('conversaId');
  const { id: userId } = c.get('user');
  const { page, pageSize } = c.req.valid('query');

  try {
    const resConversa = await strapiGet<StrapiConversa>(`/conversas/${conversaId}`, {
      populate: 'participant1,participant2,mensagens',
    });

    const conversa = resConversa.data[0];
    if (!conversa) {
      return c.json({ error: 'Conversa não encontrada' }, 404);
    }

    if (conversa.participant1Id !== userId && conversa.participant2Id !== userId) {
      return c.json({ error: 'Acesso negado' }, 403);
    }

    const mensagens = await strapiGet<StrapiMensagem>('/mensagens', {
      'filters[conversaId][$eq]': conversaId,
      'pagination[page]': page.toString(),
      'pagination[pageSize]': pageSize.toString(),
      sort: 'createdAt:asc',
      populate: 'remetente',
    });

    for (const msg of mensagens.data) {
      if (!msg.lida && msg.remetenteId !== userId) {
        await strapiPut<unknown>(`/mensagens/${msg.id}`, { lida: true });
      }
    }

    return c.json({
      data: mensagens.data,
      meta: mensagens.meta,
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// POST /mensagens/conversas/:conversaId
mensagensRoutes.post(
  '/conversas/:conversaId',
  zValidator('json', enviarMensagemSchema),
  async (c) => {
    const conversaId = c.req.param('conversaId');
    const { id: userId } = c.get('user');
    const { conteudo } = c.req.valid('json');

    try {
      const resConversa = await strapiGet<StrapiConversa>(`/conversas/${conversaId}`, {
        populate: 'participant1,participant2',
      });

      const conversa = resConversa.data[0];
      if (!conversa) {
        return c.json({ error: 'Conversa não encontrada' }, 404);
      }

      if (conversa.participant1Id !== userId && conversa.participant2Id !== userId) {
        return c.json({ error: 'Acesso negado' }, 403);
      }

      const destinatarioId = conversa.participant1Id === userId ? conversa.participant2Id : conversa.participant1Id;

      const vinculoCheck = await strapiGet<{ id: number }>('/vinculos', {
        'filters[$or][0][senderId][$eq]': userId,
        'filters[$or][0][receiverId][$eq]': destinatarioId,
        'filters[$or][0][estado][$eq]': 'connected',
        'filters[$or][1][senderId][$eq]': destinatarioId,
        'filters[$or][1][receiverId][$eq]': userId,
        'filters[$or][1][estado][$eq]': 'connected',
        'pagination[pageSize]': '1',
      });

      if (vinculoCheck.data.length === 0) {
        return c.json({ error: 'O vínculo foi removido. Não é possível enviar novas mensagens.' }, 403);
      }

      const resMsg = await strapiPost<StrapiMensagem>('/mensagens', {
        conversaId,
        remetenteId: userId,
        conteudo,
        lida: false,
      });

      await strapiPut<unknown>(`/conversas/${conversaId}`, {
        ultimaMensagem: resMsg.data.id,
        updatedAt: new Date().toISOString(),
      });

      // G15: Impacto e Resiliência via Outbox
      await eventBus.publishWithOutbox(DomainEventName.MENSAGEM_ENVIADA, {
        mensagemId: resMsg.data.id,
        conversaId,
        remetenteId: userId,
        destinatarioId,
        conteudo,
        createdAt: new Date().toISOString()
      });

      return c.json(resMsg.data, 201);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);
