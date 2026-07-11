import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { requireApproved } from '../middleware/requireApproved.js';
import { rateLimitContentCreate } from '../middleware/rateLimit.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { persistedEntityId } from '../modules/strapi/strapi-entity.js';
import { CriarSimulacaoPayloadSchema, type Tentativa } from '@pdc/shared';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { canPublishSimTipo, DISABLED_SIM_TIPO_RESPONSE } from '../modules/simulacoes/publish-gates.js';
import { simulacaoTentativasRoutes } from './simulacoes-tentativas.js';
import { applyPublicCatalogStateFilter, isPublicCatalogEstado } from './publication-state.js';
import { toPaginatedResponse } from './pagination.js';

type Vars = { Variables: AuthVariables };

const simQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  tipo: z.coerce.number().int().min(1).max(3).optional(),
});

interface StrapiSimulacao {
  id: string | number;
  documentId?: string;
  slug?: string;
  titulo: string;
  autorId: string;
  estado: string;
  tipo: number;
  area: string;
}

export const simulacaoRoutes = new Hono<Vars>();

simulacaoRoutes.use('*', verifyJwt);
simulacaoRoutes.route('/tentativas', simulacaoTentativasRoutes);

async function findSimulacao(identifier: string, params: Record<string, string> = {}): Promise<StrapiSimulacao | undefined> {
  const bySlug = await strapiGet<StrapiSimulacao>('/simulacoes', {
    ...params,
    'filters[slug][$eq]': identifier,
    'pagination[pageSize]': '1',
  });
  if (bySlug.data[0]) return bySlug.data[0];

  const byDocumentId = await strapiGet<StrapiSimulacao>('/simulacoes', {
    ...params,
    'filters[documentId][$eq]': identifier,
    'pagination[pageSize]': '1',
  });
  if (byDocumentId.data[0]) return byDocumentId.data[0];

  if (/^\d+$/.test(identifier)) {
    const byId = await strapiGet<StrapiSimulacao>('/simulacoes', {
      ...params,
      'filters[id][$eq]': identifier,
      'pagination[pageSize]': '1',
    });
    return byId.data[0];
  }
  return undefined;
}

// GET /simulacoes
simulacaoRoutes.get('/', zValidator('query', simQuerySchema), async (c) => {
  const q = c.req.valid('query');
  const params: Record<string, string> = {};
  if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
  if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
  if (q.search !== undefined) params['filters[titulo][$containsi]'] = q.search;
  if (q.tipo !== undefined) params['filters[tipo][$eq]'] = q.tipo.toString();
  
  applyPublicCatalogStateFilter(params);

  try {
    const res = await strapiGet<StrapiSimulacao>('/simulacoes', params);
    return c.json(toPaginatedResponse(res));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /simulacoes/minhas — simulações do mentor/instituicao
simulacaoRoutes.get('/minhas', checkRole(['mentor', 'instituicao', 'super_admin']), async (c) => {
  const { id } = c.get('user');
  try {
    const res = await strapiGet<StrapiSimulacao>('/simulacoes', {
      'filters[autorId][$eq]': id,
    });
    return c.json(toPaginatedResponse(res));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /simulacoes/me/tentativas — deve vir antes de /:id
simulacaoRoutes.get('/me/tentativas', async (c) => {
  const { id } = c.get('user');
  try {
    const res = await strapiGet<Tentativa>('/tentativas', {
      'filters[perfil][userId][$eq]': id,
      populate: 'simulacao',
      'sort': 'createdAt:desc',
    });
    return c.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /simulacoes/:id
simulacaoRoutes.get('/:id', async (c) => {
  const simId = c.req.param('id');
  try {
    const data = await findSimulacao(simId);
    if (!data) return c.json({ error: 'Simulação não encontrada' }, 404);
    
    // Verificação de acesso
    const user = c.get('user');
    if (!isPublicCatalogEstado(data.estado) && data.autorId !== user.id && !['moderador', 'super_admin'].includes(user.role)) {
      return c.json({ error: 'Acesso negado' }, 403);
    }

    return c.json({
      ...data,
      id: persistedEntityId(data),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// POST /simulacoes — criar simulação
simulacaoRoutes.post('/', checkRole(['mentor', 'instituicao', 'super_admin']), requireApproved(), rateLimitContentCreate, zValidator('json', CriarSimulacaoPayloadSchema), async (c) => {
  const payload = c.req.valid('json');
  const { id: autorId } = c.get('user');
  
  try {
    if (!(await canPublishSimTipo(payload.tipo))) {
      return c.json(DISABLED_SIM_TIPO_RESPONSE, 403);
    }

    const res = await strapiPost<StrapiSimulacao>('/simulacoes', {
      ...payload,
      autorId,
      estado: 'draft',
      slug: payload.titulo.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
    });

    // G15: Impacto no Ecossistema
    const event = await eventBus.publishWithOutbox(DomainEventName.SIMULACAO_CRIADA, {
      simulacaoId: res.data.id,
      autorId,
      titulo: payload.titulo,
      area: payload.area
    });

    return c.json({
      ...res.data,
      eventId: event.id
    }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// PUT /simulacoes/:id — editar simulação
simulacaoRoutes.put('/:id', checkRole(['mentor', 'instituicao', 'super_admin']), zValidator('json', CriarSimulacaoPayloadSchema.partial()), async (c) => {
  const id = c.req.param('id');
  const payload = c.req.valid('json');
  const user = c.get('user');

  try {
    // Verificar se é o autor
    const sim = await findSimulacao(id);
    if (!sim) return c.json({ error: 'Simulação não encontrada' }, 404);

    if (sim.autorId !== user.id && !['moderador', 'super_admin'].includes(user.role)) {
      return c.json({ error: 'Não tem permissão para editar esta simulação' }, 403);
    }

    const resPut = await strapiPut<StrapiSimulacao>(`/simulacoes/${persistedEntityId(sim)}`, payload);
    return c.json(resPut);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// PATCH /simulacoes/:id/estado — transição de estado editorial
simulacaoRoutes.patch('/:id/estado', checkRole(['mentor', 'instituicao', 'moderador', 'super_admin']), zValidator('json', z.object({
  estado: z.enum(['review', 'published', 'archived']),
})), async (c) => {
  const id = c.req.param('id');
  const { estado } = c.req.valid('json');
  const user = c.get('user');

  try {
    // Buscar simulação actual
    const sim = await findSimulacao(id);
    if (!sim) {
      return c.json({ error: 'Simulação não encontrada' }, 404);
    }

    const estadoActual = sim.estado;

    // Validar transições permitidas
    const transicaoPermitida = (atual: string, novo: string, role: string): boolean => {
      if (role === 'super_admin') return true;
      if (role === 'moderador') return novo === 'archived' && atual === 'published';
      if (role === 'mentor' || role === 'instituicao') {
        if (atual === 'draft' && novo === 'review') return true;
        if (atual === 'approved' && novo === 'published') return true;
        if (atual === 'draft' && novo === 'archived') return true;
      }
      return false;
    };

    // Verificar autorização
    const podeEditar = user.id === sim.autorId || ['moderador', 'super_admin'].includes(user.role);
    if (!podeEditar) {
      return c.json({ error: 'Sem permissão para editar esta simulação' }, 403);
    }

    if (!transicaoPermitida(estadoActual, estado, user.role)) {
      return c.json({
        error: `Transição inválida de ${estadoActual} para ${estado}`
      }, 400);
    }

    if (estado === 'published' && !(await canPublishSimTipo(sim.tipo))) {
      return c.json(DISABLED_SIM_TIPO_RESPONSE, 403);
    }

    // Actualizar estado
    await strapiPut<unknown>(`/simulacoes/${persistedEntityId(sim)}`, { estado });

    // G15: Impacto no Ecossistema se for publicação
    if (estado === 'published') {
      await eventBus.publishWithOutbox(DomainEventName.SIMULACAO_PUBLICADA, {
        simulacaoId: persistedEntityId(sim),
        autorId: sim.autorId,
        titulo: sim.titulo,
        area: sim.area
      });
    }

    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});
