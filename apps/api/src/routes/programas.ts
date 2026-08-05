import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

import { verifyJwt, optionalJwt, type OptionalAuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { requireApproved } from '../middleware/requireApproved.js';
import { rateLimitContentCreate } from '../middleware/rateLimit.js';
import { strapiDelete, strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { CriarProgramaPayloadSchema, AtualizarProgramaEstadoSchema } from '@pdc/shared';
import { applyPublicCatalogStateFilter } from './publication-state.js';
import { toPaginatedResponse } from './pagination.js';
import {
  fromStrapiPrograma,
  toStrapiPrograma,
  type StrapiProgramaRecord,
} from './programas.mapper.js';
import { findStrapiEntity, persistedEntityId } from '../modules/strapi/strapi-entity.js';
import {
  canManagePrograma,
  canTransitionPrograma,
  relationId,
  resolveProgramaActor,
} from './programas-access.js';
import { programaParticipationRoutes } from './programas-participation.js';
import {
  disabledFeatureResponse,
  requireContentSubmissionEnabled,
  requireInternalQaCreatorAccess,
} from '../modules/feature-flags/cor-0001-gates.js';
import { loadContentVersions } from '../modules/conteudo/content-access.repository.js';
import {
  CONTENT_ACCESS_ERRORS,
  canPreviewContent,
  canReadResolvedPublicContent,
  parseContentState,
} from '../modules/conteudo/content-access.service.js';

// GET / e GET /:id são públicos (optionalJwt); rotas protegidas usam verifyJwt individualmente
type Vars = { Variables: OptionalAuthVariables };
export const programaRoutes = new Hono<Vars>();
const PROGRAM_REVIEWER_ROLES = ['moderador'] as const;

const PROGRAMA_POPULATE = 'capa,instituicao,responsavel,cursos,experiencias,simulacoes,projetos';

// GET /programas — catálogo público
programaRoutes.get('/', async (c) => {
  try {
    const params: Record<string, string | string[]> = {
      populate: PROGRAMA_POPULATE,
      sort: 'createdAt:desc',
    };
    applyPublicCatalogStateFilter(params);
    const res = await strapiGet<StrapiProgramaRecord>('/programas', params);
    return c.json({
      ...toPaginatedResponse(res),
      data: res.data.map(fromStrapiPrograma),
    });
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

programaRoutes.route('/', programaParticipationRoutes);

// GET /programas/minhas — programas criados pelo utilizador (protegido)
programaRoutes.get('/minhas', verifyJwt, checkRole(['mentor', 'instituicao', 'super_admin']), async (c) => {
  const user = c.get('user');
  try {
    const actor = await resolveProgramaActor(user);
    if (!actor) return c.json({ error: 'Perfil não encontrado' }, 404);
    const params: Record<string, string> = { populate: PROGRAMA_POPULATE };
    if (actor.role === 'mentor') {
      params['filters[responsavel][id][$eq]'] = String(actor.perfil.id);
    } else if (actor.role === 'instituicao') {
      if (!actor.instituicao) return c.json({ error: 'Instituição associada não encontrada' }, 404);
      params['filters[instituicao][id][$eq]'] = String(actor.instituicao.id);
    }
    // super_admin vê todos
    const res = await strapiGet<StrapiProgramaRecord>('/programas', params);
    return c.json({
      ...toPaginatedResponse(res),
      data: res.data.map(fromStrapiPrograma),
    });
  } catch {
    return c.json({ error: 'Erro ao carregar programas criados' }, 502);
  }
});

// GET /programas/:id — detalhe com controlo de acesso (criadores vêem os seus rascunhos)
programaRoutes.get('/:id', optionalJwt, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Id é obrigatório' }, 400);
  try {
    const versions = await loadContentVersions((status) => (
      findStrapiEntity<StrapiProgramaRecord>('programas', id, {
        status,
        populate: PROGRAMA_POPULATE,
      })
    ));
    const current = versions.current ?? versions.published;
    const publicReadable = canReadResolvedPublicContent({
      currentState: parseContentState(current?.estado),
      publishedState: parseContentState(versions.published?.estado),
      hasPublishedVersion: versions.published !== undefined,
    });
    if (publicReadable && versions.published) {
      return c.json(fromStrapiPrograma(versions.published));
    }
    const user = c.get('user');
    if (c.req.query('preview') !== 'true' || !user || !current) {
      return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    }
    const actor = await resolveProgramaActor(user);
    const authorId = actor && canManagePrograma(actor, current) ? user.id : undefined;
    if (!canPreviewContent({
      actor: user,
      authorId,
      reviewerRoles: PROGRAM_REVIEWER_ROLES,
    })) {
      return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    }
    return c.json(fromStrapiPrograma(current));
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

// POST /programas — criar programa (protegido)
programaRoutes.post('/',
  verifyJwt,
  checkRole(['mentor', 'instituicao', 'super_admin']),
  requireInternalQaCreatorAccess(),
  requireApproved(),
  rateLimitContentCreate,
  zValidator('json', CriarProgramaPayloadSchema),
  async (c) => {
    const user = c.get('user');
    const body = c.req.valid('json');
    try {
      const actor = await resolveProgramaActor(user);
      if (!actor) return c.json({ error: 'Perfil não encontrado' }, 404);
      if (actor.role === 'instituicao' && !actor.instituicao) {
        return c.json({ error: 'Instituição associada não encontrada' }, 404);
      }
      const criadorTipo = actor.role === 'super_admin'
        ? 'super_admin'
        : actor.role === 'instituicao' ? 'instituicao' : 'mentor';
      const slug = body.titulo
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      const programaData = {
        ...toStrapiPrograma(body),
        estado: 'draft',
        slug,
        criadorTipo,
        responsavel: relationId(actor.perfil),
        ...(actor.role === 'instituicao' && actor.instituicao
          ? { instituicao: relationId(actor.instituicao) }
          : {}),
        historicoEstados: [{ estado: 'draft', timestamp: new Date().toISOString(), autorId: user.id }],
      };
      const res = await strapiPost<StrapiProgramaRecord>('/programas', programaData);
      const programaId = res.data.documentId ?? res.data.id;
      let event;
      try {
        event = await eventBus.publishWithOutbox(DomainEventName.PROGRAMA_CRIADO, {
          programaId: String(programaId),
          autorId: String(relationId(actor.perfil)),
          titulo: body.titulo,
          area: body.area,
          criadorTipo,
        });
      } catch (eventError) {
        try {
          await strapiDelete(`/programas/${String(programaId)}`);
        } catch {
          return c.json({ error: 'Programa criado, mas o rollback falhou', code: 'PROGRAMA_CREATION_ROLLBACK_FAILED' }, 503);
        }
        throw eventError;
      }
      return c.json({ ...fromStrapiPrograma(res.data), eventId: event.id }, 201);
    } catch {
      return c.json({ error: 'Falha ao criar programa' }, 502);
    }
  }
);

// PUT /programas/:id — atualizar programa (protegido)
programaRoutes.put('/:id',
  verifyJwt,
  checkRole(['mentor', 'instituicao', 'super_admin']),
  requireInternalQaCreatorAccess(),
  zValidator('json', CriarProgramaPayloadSchema.partial()),
  async (c) => {
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Id é obrigatório' }, 400);
    const user = c.get('user');
    const body = c.req.valid('json');
    try {
      const actor = await resolveProgramaActor(user);
      if (!actor) return c.json({ error: 'Perfil não encontrado' }, 404);

      const existing = await findStrapiEntity<StrapiProgramaRecord>('programas', id, {
        populate: 'responsavel,instituicao',
      });
      if (!existing) return c.json({ error: 'Programa não encontrado' }, 404);

      if (!canManagePrograma(actor, existing)) {
        return c.json({ error: 'Autoridade insuficiente' }, 403);
      }

      const resPut = await strapiPut<StrapiProgramaRecord>(
        `/programas/${persistedEntityId(existing)}`,
        toStrapiPrograma(body),
      );
      const updated = await findStrapiEntity<StrapiProgramaRecord>('programas', id, {
        populate: PROGRAMA_POPULATE,
      });
      return c.json(fromStrapiPrograma(updated ?? resPut.data));
    } catch {
      return c.json({ error: 'Falha ao atualizar programa' }, 502);
    }
  }
);

// POST /programas/:id/submeter — submissão canónica para revisão
programaRoutes.post(
  '/:id/submeter',
  verifyJwt,
  checkRole(['mentor', 'instituicao', 'super_admin']),
  requireContentSubmissionEnabled(),
  requireInternalQaCreatorAccess(),
  async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    try {
      const actor = await resolveProgramaActor(user);
      if (!actor) return c.json({ error: 'Perfil não encontrado' }, 404);
      const programa = await findStrapiEntity<StrapiProgramaRecord>('programas', id, {
        populate: 'responsavel,instituicao',
      });
      if (!programa) return c.json({ error: 'Programa não encontrado' }, 404);
      if (!canManagePrograma(actor, programa)) {
        return c.json({ error: 'Autoridade insuficiente' }, 403);
      }
      if (!canTransitionPrograma(programa.estado, 'review', user.role)) {
        return c.json({ error: `Transição inválida de ${programa.estado} para review` }, 409);
      }
      await strapiPut<unknown>(`/programas/${persistedEntityId(programa)}`, {
        estado: 'review',
        historicoEstados: [...(programa.historicoEstados ?? []), {
          estado: 'review',
          timestamp: new Date().toISOString(),
          autorId: user.id,
        }],
      });
      return c.json({ success: true });
    } catch {
      return c.json({ error: 'Falha na transição de estado' }, 502);
    }
  },
);

// PATCH /programas/:id/estado — transição de estado editorial (protegido)
programaRoutes.patch('/:id/estado',
  verifyJwt,
  checkRole(['mentor', 'instituicao', 'moderador', 'super_admin']),
  requireInternalQaCreatorAccess(),
  zValidator('json', AtualizarProgramaEstadoSchema),
  async (c) => {
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Id é obrigatório' }, 400);
    const user = c.get('user');
    const { estado, motivoRejeicao } = c.req.valid('json');
    const { id: userId, role } = user;
    try {
      if (estado === 'review') {
        const unavailable = await disabledFeatureResponse(
          c,
          'content_submission_enabled',
          'CONTENT_SUBMISSION_TEMPORARILY_DISABLED',
        );
        if (unavailable) return unavailable;
      }
      const actor = await resolveProgramaActor(user);
      if (!actor) return c.json({ error: 'Perfil não encontrado' }, 404);

      const programa = await findStrapiEntity<StrapiProgramaRecord>('programas', id, {
        populate: 'responsavel,instituicao',
      });
      if (!programa) return c.json({ error: 'Programa não encontrado' }, 404);

      const estadoAtual = programa.estado;

      const podeEditar = role === 'moderador' || canManagePrograma(actor, programa);
      if (!podeEditar) return c.json({ error: 'Sem permissão para editar este programa' }, 403);
      if (!canTransitionPrograma(estadoAtual, estado, role)) {
        return c.json({ error: `Transição inválida de ${estadoAtual} para ${estado}` }, 400);
      }

      const novoHistorico = [...(programa.historicoEstados ?? []), {
        estado,
        timestamp: new Date().toISOString(),
        autorId: userId,
      }];

      await strapiPut<unknown>(`/programas/${persistedEntityId(programa)}`, {
        estado,
        motivoRejeicao: estado === 'archived' && motivoRejeicao ? motivoRejeicao : undefined,
        historicoEstados: novoHistorico,
      });

      if (estado === 'published') {
        await eventBus.publishWithOutbox(DomainEventName.PROGRAMA_PUBLICADO, {
          programaId: id,
          autorId: programa.responsavel?.id ?? 'unknown',
          titulo: programa.titulo,
          instituicaoId: programa.instituicao?.id ?? 'unknown',
        });
      }

      return c.json({ success: true });
    } catch {
      return c.json({ error: 'Falha na transição de estado' }, 502);
    }
  }
);
