import { Hono, type Handler } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, optionalJwt, type AuthVariables, type OptionalAuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { requireApproved } from '../middleware/requireApproved.js';
import { rateLimitContentCreate } from '../middleware/rateLimit.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { CriarCursoPayloadSchema, type CriarCursoPayload, Curso, Inscricao, BehaviorPattern } from '@pdc/shared';
import { cursosService } from '../modules/cursos/cursos.service.js';
import { applyPublicCatalogStateFilter } from './publication-state.js';
import { toPaginatedResponse } from './pagination.js';
import {
  disabledFeatureResponse,
  requireContentSubmissionEnabled,
  requireInternalQaCreatorAccess,
} from '../modules/feature-flags/cor-0001-gates.js';
import {
  CONTENT_ACCESS_ERRORS,
  canPreviewContent,
  canReadResolvedPublicContent,
  decideLearnerAccess,
  isUnavailableContentState,
  parseContentState,
} from '../modules/conteudo/content-access.service.js';
import { persistedEntityId } from '../modules/strapi/strapi-entity.js';

// C-01: OptionalAuthVariables — GET / e GET /:id são públicos; rotas protegidas usam verifyJwt individualmente
type Vars = { Variables: OptionalAuthVariables };

const cursoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  categoria: z.string().optional(),
  autorId: z.string().optional(),
});

export const cursoRoutes = new Hono<Vars>();
const COURSE_REVIEWER_ROLES = ['comite_cientifico', 'moderador'] as const;

interface CourseEnrollmentAccess extends Omit<Inscricao, 'curso'> {
  curso?: {
    id: string | number;
    documentId?: string;
  };
}

function stripLockedItems(curso: Curso): Curso {
  return {
    ...curso,
    modulos: curso.modulos?.map((modulo) => ({
      ...modulo,
      itens: modulo.itens.map((item) => ({
        ...item,
        conteudo: undefined,
        url: undefined,
      })),
    })),
  };
}

// GET /cursos — catálogo público com Merit Guard condicional
cursoRoutes.get('/', optionalJwt, zValidator('query', cursoQuerySchema), async (c) => {
  const q = c.req.valid('query');
  const user = c.get('user');

  const params: Record<string, string | string[]> = { populate: 'autor' };
  applyPublicCatalogStateFilter(params);
  if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
  if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
  if (q.search !== undefined) params['filters[titulo][$containsi]'] = q.search;

  try {
    const res = await strapiGet<Curso>('/cursos', params);

    if (user?.role === 'estudante') {
      const patternsRes = await strapiGet<BehaviorPattern>('/behavior-patterns', { 'filters[perfil][userId][$eq]': user.id });
      const pattern = patternsRes.data[0];

      const enrichedData = res.data.map((curso) => {
        const rules = curso.regrasAcesso;
        let blocked = false;
        let reason = '';
        if (rules && pattern) {
          if (rules.minFluidez && Number.isFinite(pattern.cognitiveFluidity) && pattern.cognitiveFluidity < rules.minFluidez) { blocked = true; reason = 'Fluidez insuficiente'; }
          if (rules.minResiliencia && Number.isFinite(pattern.resilienceIndex) && pattern.resilienceIndex < rules.minResiliencia) { blocked = true; reason = 'Resiliência insuficiente'; }
        }
        return { ...curso, bloqueado: blocked, motivoBloqueio: reason };
      });
      return c.json(toPaginatedResponse({ ...res, data: enrichedData }));
    }
    return c.json(toPaginatedResponse(res));
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

// GET /cursos/meus — cursos do criador (protegido)
cursoRoutes.get('/meus', verifyJwt, checkRole(['mentor', 'instituicao', 'super_admin']), async (c) => {
  const user = c.get('user');
  try {
    const res = await strapiGet<Curso>('/cursos', {
      'filters[autorId][$eq]': user.id,
      populate: 'autor',
      'pagination[page]': c.req.query('page') || '1',
    });
    return c.json(toPaginatedResponse(res));
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// GET /cursos/me/inscricoes — inscrições do utilizador (protegido)
cursoRoutes.get('/me/inscricoes', verifyJwt, async (c) => {
  const user = c.get('user');
  try {
    const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
    const res = await strapiGet<CourseEnrollmentAccess>('/inscricoes', {
      'filters[perfil][id][$eq]': perfilId,
      populate: 'curso',
    });
    for (const enrollment of res.data) {
      const cursoId = enrollment.curso ? persistedEntityId(enrollment.curso) : undefined;
      if (!cursoId) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
      const versions = await cursosService.obterVersoesCurso(cursoId);
      const current = versions.current ?? versions.published;
      const decision = decideLearnerAccess({
        actor: user,
        authorId: current?.autorId,
        reviewerRoles: COURSE_REVIEWER_ROLES,
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

// GET /cursos/:id — detalhe público com controlo de acesso
cursoRoutes.get('/:id', optionalJwt, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
  try {
    const versions = await cursosService.obterVersoesCurso(id);
    const current = versions.current ?? versions.published;
    const currentState = parseContentState(current?.estado);
    const publishedState = parseContentState(versions.published?.estado);
    const user = c.get('user');
    const publicReadable = canReadResolvedPublicContent({
      currentState,
      publishedState,
      hasPublishedVersion: versions.published !== undefined,
    });

    if (!publicReadable) {
      if (user && isUnavailableContentState(currentState)) {
        const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
        const reference = current ?? versions.published;
        const existing = reference
          ? await cursosService.buscarInscricao(persistedEntityId(reference), perfilId)
          : undefined;
        if (existing) return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
      }
      const previewRequested = c.req.query('preview') === 'true';
      if (!previewRequested || !user || !current || !canPreviewContent({
        actor: user,
        authorId: current.autorId,
        reviewerRoles: COURSE_REVIEWER_ROLES,
      })) {
        return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
      }
      const preview = await cursosService.obterCursoComModulos(id, 'draft');
      if (!preview) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
      return c.json(preview);
    }

    const data = await cursosService.obterCursoComModulos(id, 'published');
    if (!data) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    if (!user) return c.json(stripLockedItems(data));

    const canSeeFullContent = data.autorId === user.id ||
      ['comite_cientifico', 'moderador', 'super_admin'].includes(user.role);
    if (canSeeFullContent) return c.json(data);

    const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
    const inscricao = await cursosService.buscarInscricao(id, perfilId);
    return c.json(inscricao ? data : stripLockedItems(data));
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

// POST /cursos — criar curso (protegido)
cursoRoutes.post('/', verifyJwt, checkRole(['mentor', 'instituicao', 'super_admin']), requireInternalQaCreatorAccess(), requireApproved(), rateLimitContentCreate, zValidator('json', CriarCursoPayloadSchema), async (c) => {
  const user = c.get('user');
  try {
    const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
    const draftPayload = {
      ...c.req.valid('json'),
      estado: 'draft',
    } satisfies CriarCursoPayload;
    const curso = await cursosService.criarCursoCompleto(
      draftPayload,
      user.id,
      perfilId,
    );
    return c.json(curso, 201);
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// PUT /cursos/:id — atualizar curso (protegido)
cursoRoutes.put('/:id', verifyJwt, checkRole(['mentor', 'instituicao', 'super_admin']), requireInternalQaCreatorAccess(), zValidator('json', CriarCursoPayloadSchema.partial()), async (c) => {
  const user = c.get('user');
  try {
    const curso = await cursosService.obterCursoBase(c.req.param('id'));
    if (!curso) return c.json({ error: 'Curso não encontrado' }, 404);
    if (curso.autorId !== user.id && !['moderador', 'super_admin'].includes(user.role)) {
      return c.json({ error: 'Não tem permissão' }, 403);
    }
    const { estado: _requestedState, ...draftChanges } = c.req.valid('json');
    void _requestedState;
    const resPut = await cursosService.atualizarCurso(c.req.param('id'), draftChanges, user.id);
    return c.json(resPut);
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// POST /cursos/:id/submeter — submissão canónica para revisão
cursoRoutes.post(
  '/:id/submeter',
  verifyJwt,
  checkRole(['mentor', 'instituicao', 'super_admin']),
  requireContentSubmissionEnabled(),
  requireInternalQaCreatorAccess(),
  async (c) => {
    const user = c.get('user');
    try {
      const curso = await cursosService.obterCursoBase(c.req.param('id'));
      if (!curso) return c.json({ error: 'Curso não encontrado' }, 404);
      if (curso.autorId !== user.id && user.role !== 'super_admin') {
        return c.json({ error: 'Sem permissão' }, 403);
      }
      if (curso.estado !== 'draft') {
        return c.json({ error: `Transição inválida de ${curso.estado} para review` }, 409);
      }
      await cursosService.alterarEstado(c.req.param('id'), 'review', curso.autorId, curso);
      return c.json({ success: true });
    } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  },
);

// PATCH /cursos/:id/estado (protegido)
cursoRoutes.patch('/:id/estado', verifyJwt, checkRole(['mentor', 'instituicao', 'moderador', 'super_admin']), requireInternalQaCreatorAccess(), zValidator('json', z.object({ estado: z.enum(['draft', 'review', 'published', 'archived']) })), async (c) => {
  const user = c.get('user');
  try {
    const nextState = c.req.valid('json').estado;
    if (nextState === 'review') {
      const unavailable = await disabledFeatureResponse(
        c,
        'content_submission_enabled',
        'CONTENT_SUBMISSION_TEMPORARILY_DISABLED',
      );
      if (unavailable) return unavailable;
    }
    const curso = await cursosService.obterCursoBase(c.req.param('id'));
    if (!curso) return c.json({ error: 'Curso não encontrado' }, 404);
    const podeEditar = user.id === curso.autorId || ['moderador', 'super_admin'].includes(user.role);
    if (!podeEditar) return c.json({ error: 'Sem permissão' }, 403);
    if (nextState === 'published' && curso.estado !== 'approved' && user.role !== 'super_admin') {
      return c.json({ error: 'Curso precisa estar aprovado antes da publicação' }, 409);
    }
    await cursosService.alterarEstado(c.req.param('id'), nextState, curso.autorId, curso);
    return c.json({ success: true });
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

const enrollInCourse: Handler<{ Variables: AuthVariables }> = async (c) => {
  const user = c.get('user');
  try {
    const cursoId = c.req.param('id');
    if (!cursoId) return c.json({ error: 'Id do curso é obrigatório' }, 400);
    const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
    const versions = await cursosService.obterVersoesCurso(cursoId);
    const current = versions.current ?? versions.published;
    const reference = current ?? versions.published;
    const persistedCursoId = reference ? persistedEntityId(reference) : undefined;
    const existing = persistedCursoId
      ? await cursosService.buscarInscricao(persistedCursoId, perfilId)
      : undefined;
    const decision = decideLearnerAccess({
      actor: user,
      authorId: current?.autorId,
      reviewerRoles: COURSE_REVIEWER_ROLES,
      currentState: parseContentState(current?.estado),
      publishedState: parseContentState(versions.published?.estado),
      hasPublishedVersion: versions.published !== undefined,
      relationExists: existing !== undefined,
      accessPolicy: 'open',
    });
    if (decision === 'preview_only') return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
    if (decision === 'content_not_available') return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
    if (decision === 'content_not_found') return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    if (!versions.published) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    const res = await cursosService.inscreverUtilizador(
      persistedEntityId(versions.published),
      user.id,
      perfilId,
      user.role,
    );
    return c.json(res, 201);
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
};

// POST /cursos/:id/inscricao (protegido)
cursoRoutes.post('/:id/inscricao', verifyJwt, checkRole(['estudante', 'mentor', 'instituicao', 'super_admin']), enrollInCourse);

// POST /cursos/:id/inscrever — alias (protegido)
cursoRoutes.post('/:id/inscrever', verifyJwt, checkRole(['estudante', 'mentor', 'instituicao', 'super_admin']), enrollInCourse);

// GET /cursos/:id/progresso (protegido)
cursoRoutes.get('/:id/progresso', verifyJwt, checkRole(['estudante', 'mentor', 'instituicao', 'super_admin']), async (c) => {
  const user = c.get('user');
  try {
    const cursoId = c.req.param('id');
    if (!cursoId) return c.json({ error: 'Id do curso é obrigatório' }, 400);
    const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
    const versions = await cursosService.obterVersoesCurso(cursoId);
    const current = versions.current ?? versions.published;
    const reference = current ?? versions.published;
    const persistedCursoId = reference ? persistedEntityId(reference) : undefined;
    const existing = persistedCursoId
      ? await cursosService.buscarInscricao(persistedCursoId, perfilId)
      : undefined;
    const decision = decideLearnerAccess({
      actor: user,
      authorId: current?.autorId,
      reviewerRoles: COURSE_REVIEWER_ROLES,
      currentState: parseContentState(current?.estado),
      publishedState: parseContentState(versions.published?.estado),
      hasPublishedVersion: versions.published !== undefined,
      relationExists: existing !== undefined,
      accessPolicy: 'open',
    });
    if (decision === 'preview_only') return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
    if (decision === 'content_not_available') return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
    if (decision === 'content_not_found') return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    if (!versions.published) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    const progresso = await cursosService.listarProgresso(persistedEntityId(versions.published), perfilId);
    if (progresso === null) return c.json({ error: 'Inscrição não encontrada' }, 404);
    return c.json(progresso);
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

// PATCH /cursos/:id/progresso/:itemId (protegido)
cursoRoutes.patch(
  '/:id/progresso/:itemId',
  verifyJwt,
  checkRole(['estudante', 'mentor', 'instituicao', 'super_admin']),
  zValidator('json', z.object({ concluido: z.boolean() })),
  async (c) => {
    const user = c.get('user');
    try {
      const cursoId = c.req.param('id');
      const itemId = c.req.param('itemId');
      if (!cursoId || !itemId) return c.json({ error: 'Id do curso e do item são obrigatórios' }, 400);
      const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
      const versions = await cursosService.obterVersoesCurso(cursoId);
      const current = versions.current ?? versions.published;
      const reference = current ?? versions.published;
      const persistedCursoId = reference ? persistedEntityId(reference) : undefined;
      const existing = persistedCursoId
        ? await cursosService.buscarInscricao(persistedCursoId, perfilId)
        : undefined;
      const decision = decideLearnerAccess({
        actor: user,
        authorId: current?.autorId,
        reviewerRoles: COURSE_REVIEWER_ROLES,
        currentState: parseContentState(current?.estado),
        publishedState: parseContentState(versions.published?.estado),
        hasPublishedVersion: versions.published !== undefined,
        relationExists: existing !== undefined,
        accessPolicy: 'open',
      });
      if (decision === 'preview_only') return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
      if (decision === 'content_not_available') return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
      if (decision === 'content_not_found') return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
      if (!versions.published) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
      const item = await cursosService.marcarItem(
        persistedEntityId(versions.published),
        itemId,
        perfilId,
        user.id,
        c.req.valid('json').concluido,
      );
      return c.json(item);
    } catch {
      return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
    }
  },
);
