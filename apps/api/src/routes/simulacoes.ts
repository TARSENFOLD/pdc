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
import { applyPublicCatalogStateFilter } from './publication-state.js';
import { toPaginatedResponse } from './pagination.js';
import {
  disabledFeatureResponse,
  requireContentSubmissionEnabled,
  requireInternalQaCreatorAccess,
} from '../modules/feature-flags/cor-0001-gates.js';
import {
  findSimulacao,
  loadSimulacaoVersions,
  type StrapiSimulacaoAccessRecord,
} from '../modules/simulacoes/simulacao-access.repository.js';
import {
  CONTENT_ACCESS_ERRORS,
  canPreviewContent,
  canReadResolvedPublicContent,
  decideLearnerAccess,
  parseContentState,
} from '../modules/conteudo/content-access.service.js';

type Vars = { Variables: AuthVariables };

const simQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  tipo: z.coerce.number().int().min(1).max(3).optional(),
});

type StrapiSimulacao = StrapiSimulacaoAccessRecord;

interface TentativaWithSimulacao extends Tentativa {
  simulacao?: {
    id: string | number;
    documentId?: string;
  };
}

export const simulacaoRoutes = new Hono<Vars>();

simulacaoRoutes.use('*', verifyJwt);
simulacaoRoutes.route('/tentativas', simulacaoTentativasRoutes);
const SIMULATION_REVIEWER_ROLES = ['comite_cientifico', 'moderador'] as const;

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
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
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
    const res = await strapiGet<TentativaWithSimulacao>('/tentativas', {
      'filters[perfil][userId][$eq]': id,
      populate: 'simulacao',
      'sort': 'createdAt:desc',
    });
    for (const attempt of res.data) {
      const simulacaoId = attempt.simulacao ? persistedEntityId(attempt.simulacao) : undefined;
      if (!simulacaoId) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
      const versions = await loadSimulacaoVersions(simulacaoId);
      const current = versions.current ?? versions.published;
      const decision = decideLearnerAccess({
        actor: c.get('user'),
        authorId: current?.autorId,
        reviewerRoles: SIMULATION_REVIEWER_ROLES,
        currentState: parseContentState(current?.estado),
        publishedState: parseContentState(versions.published?.estado),
        hasPublishedVersion: versions.published !== undefined,
        relationExists: true,
        accessPolicy: 'granted',
      });
      if (decision === 'preview_only') return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
      if (decision === 'content_not_available') return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
      if (decision === 'content_not_found') return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    }
    return c.json(res);
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

// GET /simulacoes/:id
simulacaoRoutes.get('/:id', async (c) => {
  const simId = c.req.param('id');
  try {
    const versions = await loadSimulacaoVersions(simId);
    const current = versions.current ?? versions.published;
    const user = c.get('user');
    const publicReadable = canReadResolvedPublicContent({
      currentState: parseContentState(current?.estado),
      publishedState: parseContentState(versions.published?.estado),
      hasPublishedVersion: versions.published !== undefined,
    });
    if (!publicReadable) {
      const previewRequested = c.req.query('preview') === 'true';
      if (!previewRequested || !current || !canPreviewContent({
        actor: user,
        authorId: current.autorId,
        reviewerRoles: SIMULATION_REVIEWER_ROLES,
      })) {
        return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
      }
      return c.json({ ...current, id: persistedEntityId(current) });
    }
    const data = versions.published;
    if (!data) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    return c.json({
      ...data,
      id: persistedEntityId(data),
    });
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

// POST /simulacoes — criar simulação
simulacaoRoutes.post('/', checkRole(['mentor', 'instituicao', 'super_admin']), requireInternalQaCreatorAccess(), requireApproved(), rateLimitContentCreate, zValidator('json', CriarSimulacaoPayloadSchema), async (c) => {
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
simulacaoRoutes.put('/:id', checkRole(['mentor', 'instituicao', 'super_admin']), requireInternalQaCreatorAccess(), zValidator('json', CriarSimulacaoPayloadSchema.partial()), async (c) => {
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

// POST /simulacoes/:id/submeter — submissão canónica para revisão
simulacaoRoutes.post(
  '/:id/submeter',
  checkRole(['mentor', 'instituicao', 'super_admin']),
  requireContentSubmissionEnabled(),
  requireInternalQaCreatorAccess(),
  async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    try {
      const sim = await findSimulacao(id);
      if (!sim) return c.json({ error: 'Simulação não encontrada' }, 404);
      if (sim.autorId !== user.id && user.role !== 'super_admin') {
        return c.json({ error: 'Sem permissão para editar esta simulação' }, 403);
      }
      if (sim.estado !== 'draft') {
        return c.json({ error: `Transição inválida de ${sim.estado} para review` }, 409);
      }
      await strapiPut<unknown>(`/simulacoes/${persistedEntityId(sim)}`, { estado: 'review' });
      return c.json({ success: true });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  },
);

// PATCH /simulacoes/:id/estado — transição de estado editorial
simulacaoRoutes.patch('/:id/estado', checkRole(['mentor', 'instituicao', 'moderador', 'super_admin']), requireInternalQaCreatorAccess(), zValidator('json', z.object({
  estado: z.enum(['review', 'published', 'archived']),
})), async (c) => {
  const id = c.req.param('id');
  const { estado } = c.req.valid('json');
  const user = c.get('user');

  try {
    if (estado === 'review') {
      const unavailable = await disabledFeatureResponse(
        c,
        'content_submission_enabled',
        'CONTENT_SUBMISSION_TEMPORARILY_DISABLED',
      );
      if (unavailable) return unavailable;
    }
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
