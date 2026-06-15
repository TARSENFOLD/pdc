import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import {
  StrapiHttpError,
  strapiGet,
  strapiPost,
  strapiPut,
} from '../modules/strapi/strapi.client.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { toPaginatedResponse } from './pagination.js';
import {
  findStrapiEntity,
  persistedEntityId,
} from '../modules/strapi/strapi-entity.js';
import {
  getInteractionPerfil,
  interactionPerfilId,
  type InteractionPerfil,
} from '../modules/interactions/interaction-profile.js';
import pino from 'pino';
import {
  hasApprovedConnection,
  isParticipant,
  orderedParticipants,
  otherParticipant,
  toConversa,
  toMensagem,
  type StrapiConversa,
  type StrapiMensagem,
} from './mensagens.helpers.js';

type Vars = { Variables: AuthVariables };
const log = pino({ name: 'routes:mensagens' });

const criarConversaSchema = z.object({
  destinatarioId: z.string().min(1),
});

const enviarMensagemSchema = z.object({
  conteudo: z.string().trim().min(1).max(2000),
});

const mensagensQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const mensagensRoutes = new Hono<Vars>();

mensagensRoutes.use('*', verifyJwt);

mensagensRoutes.get('/conversas', zValidator('query', mensagensQuerySchema), async (c) => {
  const { id: userId } = c.get('user');
  const { page, pageSize } = c.req.valid('query');

  try {
    const response = await strapiGet<StrapiConversa>('/conversas', {
      'filters[$or][0][participant1][userId][$eq]': userId,
      'filters[$or][1][participant2][userId][$eq]': userId,
      'pagination[page]': page.toString(),
      'pagination[pageSize]': pageSize.toString(),
      populate: 'participant1.foto,participant2.foto,ultimaMensagem.remetente',
      sort: 'updatedAt:desc',
    });
    const unreadCounts = await Promise.all(response.data.map(async (conversa) => {
      const conversaId = String(conversa.id);
      const unread = await strapiGet<StrapiMensagem>('/mensagens', {
        'filters[conversa][id][$eq]': conversaId,
        'filters[remetente][userId][$ne]': userId,
        'filters[lida][$eq]': 'false',
        'pagination[pageSize]': '1',
        'pagination[withCount]': 'true',
      });
      return [conversaId, unread.meta.pagination.total] as const;
    }));
    const unreadByConversation = new Map(unreadCounts);

    const data = response.data.map((conversa) => toConversa(
      conversa,
      userId,
      unreadByConversation.get(String(conversa.id)) ?? 0,
    ));

    return c.json(toPaginatedResponse({ ...response, data }));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

mensagensRoutes.post('/conversas', zValidator('json', criarConversaSchema), async (c) => {
  const { id: userId } = c.get('user');
  const { destinatarioId } = c.req.valid('json');

  try {
    const [remetente, destinatario] = await Promise.all([
      getInteractionPerfil(userId),
      findStrapiEntity<InteractionPerfil>('perfis', destinatarioId, { populate: 'foto' }),
    ]);
    if (!remetente || !destinatario) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }
    if (remetente.userId === destinatario.userId) {
      return c.json({ error: 'Não podes criar conversa contigo próprio' }, 400);
    }
    if (!await hasApprovedConnection(userId, destinatario.userId)) {
      return c.json({ error: 'Só podes enviar mensagens a vínculos confirmados' }, 403);
    }

    const [participant1, participant2] = orderedParticipants(remetente, destinatario);
    const existente = await strapiGet<StrapiConversa>('/conversas', {
      'filters[$or][0][participant1][id][$eq]': String(remetente.id),
      'filters[$or][0][participant2][id][$eq]': String(destinatario.id),
      'filters[$or][1][participant1][id][$eq]': String(destinatario.id),
      'filters[$or][1][participant2][id][$eq]': String(remetente.id),
      'pagination[pageSize]': '1',
      populate: 'participant1.foto,participant2.foto',
    });
    if (existente.data[0]) {
      return c.json(toConversa(existente.data[0], userId));
    }

    let criada;
    try {
      criada = await strapiPost<StrapiConversa>('/conversas', {
        participant1: interactionPerfilId(participant1),
        participant2: interactionPerfilId(participant2),
        // Mantido explícito para a recuperação idempotente após conflito;
        // o lifecycle do Strapi recalcula e valida a mesma chave.
        participantsKey: `${String(participant1.id)}:${String(participant2.id)}`,
        criadoEm: new Date().toISOString(),
      });
    } catch (error) {
      if (!(error instanceof StrapiHttpError) || error.status !== 409) throw error;
      const concurrent = await strapiGet<StrapiConversa>('/conversas', {
        'filters[participantsKey][$eq]': `${String(participant1.id)}:${String(participant2.id)}`,
        'pagination[pageSize]': '1',
        populate: 'participant1.foto,participant2.foto',
      });
      const existingConversation = concurrent.data[0];
      if (!existingConversation) throw error;
      return c.json(toConversa(existingConversation, userId));
    }
    return c.json(toConversa({
      ...criada.data,
      participant1,
      participant2,
    }, userId), 201);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

mensagensRoutes.get(
  '/conversas/:conversaId',
  zValidator('query', mensagensQuerySchema),
  async (c) => {
    const conversaId = c.req.param('conversaId');
    const { id: userId } = c.get('user');
    const { page, pageSize } = c.req.valid('query');

    try {
      const conversa = await findStrapiEntity<StrapiConversa>('conversas', conversaId, {
        populate: 'participant1,participant2',
      });
      if (!conversa) return c.json({ error: 'Conversa não encontrada' }, 404);
      if (!isParticipant(conversa, userId)) return c.json({ error: 'Acesso negado' }, 403);

      const mensagens = await strapiGet<StrapiMensagem>('/mensagens', {
        'filters[conversa][id][$eq]': String(conversa.id),
        'pagination[page]': page.toString(),
        'pagination[pageSize]': pageSize.toString(),
        sort: 'criadoEm:asc',
        populate: 'remetente,destinatario',
      });

      const readResults = await Promise.allSettled(mensagens.data
        .filter((mensagem) => !mensagem.lida && mensagem.remetente.userId !== userId)
        .map((mensagem) => strapiPut(`/mensagens/${persistedEntityId(mensagem)}`, {
          lida: true,
          lidaEm: new Date().toISOString(),
        })));
      const failures = readResults.filter((result) => result.status === 'rejected');
      if (failures.length > 0) {
        log.warn({ conversaId, failures: failures.length }, 'Algumas mensagens não foram marcadas como lidas');
        c.header('X-PDC-Read-Mark-Failures', String(failures.length));
      }

      return c.json(toPaginatedResponse({
        ...mensagens,
        data: mensagens.data.map((mensagem) => toMensagem(mensagem, String(conversa.id))),
      }));
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  },
);

mensagensRoutes.post(
  '/conversas/:conversaId',
  zValidator('json', enviarMensagemSchema),
  async (c) => {
    const conversaId = c.req.param('conversaId');
    const { id: userId } = c.get('user');
    const { conteudo } = c.req.valid('json');

    try {
      const conversa = await findStrapiEntity<StrapiConversa>('conversas', conversaId, {
        populate: 'participant1,participant2',
      });
      if (!conversa) return c.json({ error: 'Conversa não encontrada' }, 404);
      if (!isParticipant(conversa, userId)) return c.json({ error: 'Acesso negado' }, 403);

      const remetente = conversa.participant1.userId === userId
        ? conversa.participant1
        : conversa.participant2;
      const destinatario = otherParticipant(conversa, userId);
      if (!await hasApprovedConnection(userId, destinatario.userId)) {
        return c.json({ error: 'O vínculo foi removido. Não é possível enviar novas mensagens.' }, 403);
      }

      const criada = await strapiPost<StrapiMensagem>('/mensagens', {
        conversa: persistedEntityId(conversa),
        remetente: interactionPerfilId(remetente),
        destinatario: interactionPerfilId(destinatario),
        conteudo,
        lida: false,
        tipo: 'texto',
        criadoEm: new Date().toISOString(),
      });

      await strapiPut(`/conversas/${persistedEntityId(conversa)}`, {
        ultimaMensagem: persistedEntityId(criada.data),
      });
      await eventBus.publishWithOutbox(DomainEventName.MENSAGEM_ENVIADA, {
        mensagemId: String(criada.data.id),
        conversaId: String(conversa.id),
        remetenteId: userId,
        destinatarioId: destinatario.userId,
        conteudo,
        createdAt: new Date().toISOString(),
      });

      return c.json(toMensagem({ ...criada.data, remetente }, String(conversa.id)), 201);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  },
);
