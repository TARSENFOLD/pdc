import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, optionalJwt, type OptionalAuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { requireApproved } from '../middleware/requireApproved.js';
import { rateLimitContentCreate } from '../middleware/rateLimit.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { CriarCursoPayloadSchema, type CriarCursoPayload, Curso, Inscricao, BehaviorPattern } from '@pdc/shared';
import { cursosService } from '../modules/cursos/cursos.service.js';
import { applyPublicCatalogStateFilter, isPublicCatalogEstado } from './publication-state.js';
import { toPaginatedResponse } from './pagination.js';

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

function first<T>(data: T | T[] | undefined): T | undefined {
  return Array.isArray(data) ? data[0] : data;
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
          if (rules.minFluidez && (pattern.cognitiveFluidity || 0) < rules.minFluidez) { blocked = true; reason = 'Fluidez insuficiente'; }
          if (rules.minResiliencia && (pattern.resilienceIndex || 0) < rules.minResiliencia) { blocked = true; reason = 'Resiliência insuficiente'; }
        }
        return { ...curso, bloqueado: blocked, motivoBloqueio: reason };
      });
      return c.json(toPaginatedResponse({ ...res, data: enrichedData }));
    }
    return c.json(toPaginatedResponse(res));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
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
    const res = await strapiGet<Inscricao>('/inscricoes', { 'filters[perfil][id][$eq]': perfilId, populate: 'curso' });
    return c.json(res);
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// GET /cursos/:id — detalhe público com controlo de acesso
cursoRoutes.get('/:id', optionalJwt, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Curso não encontrado' }, 404);
  try {
    const data = await cursosService.obterCursoComModulos(id);
    if (!data) return c.json({ error: 'Curso não encontrado' }, 404);

    const user = c.get('user');

    if (!isPublicCatalogEstado(data.estado)) {
      if (!user || (data.autorId !== user.id && !['moderador', 'super_admin'].includes(user.role))) {
        return c.json({ error: 'Acesso negado' }, 403);
      }
    }

    if (!user) return c.json(stripLockedItems(data));

    const canSeeFullContent = data.autorId === user.id ||
      ['comite_cientifico', 'moderador', 'super_admin'].includes(user.role);
    if (canSeeFullContent) return c.json(data);

    const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
    const inscricao = await cursosService.buscarInscricao(id, perfilId);
    return c.json(inscricao ? data : stripLockedItems(data));
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// POST /cursos — criar curso (protegido)
cursoRoutes.post('/', verifyJwt, checkRole(['mentor', 'instituicao', 'super_admin']), requireApproved(), rateLimitContentCreate, zValidator('json', CriarCursoPayloadSchema), async (c) => {
  const user = c.get('user');
  try {
    const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
    const curso = await cursosService.criarCursoCompleto(c.req.valid('json'), user.id, perfilId);
    return c.json(curso, 201);
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// PUT /cursos/:id — atualizar curso (protegido)
cursoRoutes.put('/:id', verifyJwt, checkRole(['mentor', 'instituicao', 'super_admin']), zValidator('json', CriarCursoPayloadSchema.partial()), async (c) => {
  const user = c.get('user');
  try {
    const resGet = await strapiGet<Curso>('/cursos', {
      'filters[id][$eq]': c.req.param('id'),
      'pagination[pageSize]': '1',
    });
    const curso = first(resGet.data);
    if (!curso) return c.json({ error: 'Curso não encontrado' }, 404);
    if (curso.autorId !== user.id && !['moderador', 'super_admin'].includes(user.role)) {
      return c.json({ error: 'Não tem permissão' }, 403);
    }
    const resPut = await cursosService.atualizarCurso(c.req.param('id'), c.req.valid('json') as Partial<CriarCursoPayload>, user.id);
    return c.json(resPut);
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// PATCH /cursos/:id/estado (protegido)
cursoRoutes.patch('/:id/estado', verifyJwt, checkRole(['mentor', 'instituicao', 'moderador', 'super_admin']), zValidator('json', z.object({ estado: z.enum(['draft', 'review', 'published', 'archived']) })), async (c) => {
  const user = c.get('user');
  try {
    const resGet = await strapiGet<Curso>('/cursos', {
      'filters[id][$eq]': c.req.param('id'),
      'pagination[pageSize]': '1',
    });
    const curso = first(resGet.data);
    if (!curso) return c.json({ error: 'Curso não encontrado' }, 404);
    const podeEditar = user.id === curso.autorId || ['moderador', 'super_admin'].includes(user.role);
    if (!podeEditar) return c.json({ error: 'Sem permissão' }, 403);
    const nextState = c.req.valid('json').estado;
    if (nextState === 'published' && curso.estado !== 'approved' && user.role !== 'super_admin') {
      return c.json({ error: 'Curso precisa estar aprovado antes da publicação' }, 409);
    }
    await cursosService.alterarEstado(c.req.param('id'), nextState, curso.autorId, curso);
    return c.json({ success: true });
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// POST /cursos/:id/inscricao (protegido)
cursoRoutes.post('/:id/inscricao', verifyJwt, checkRole(['estudante', 'mentor', 'instituicao', 'super_admin']), async (c) => {
  const user = c.get('user');
  try {
    const cursoId = c.req.param('id');
    if (!cursoId) return c.json({ error: 'Id do curso é obrigatório' }, 400);
    const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
    const res = await cursosService.inscreverUtilizador(cursoId, user.id, perfilId, user.role);
    return c.json(res, 201);
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// POST /cursos/:id/inscrever — alias (protegido)
cursoRoutes.post('/:id/inscrever', verifyJwt, checkRole(['estudante', 'mentor', 'instituicao', 'super_admin']), async (c) => {
  const user = c.get('user');
  try {
    const cursoId = c.req.param('id');
    if (!cursoId) return c.json({ error: 'Id do curso é obrigatório' }, 400);
    const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
    const res = await cursosService.inscreverUtilizador(cursoId, user.id, perfilId, user.role);
    return c.json(res, 201);
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// GET /cursos/:id/progresso (protegido)
cursoRoutes.get('/:id/progresso', verifyJwt, checkRole(['estudante', 'mentor', 'instituicao', 'super_admin']), async (c) => {
  const user = c.get('user');
  try {
    const cursoId = c.req.param('id');
    if (!cursoId) return c.json({ error: 'Id do curso é obrigatório' }, 400);
    const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
    const progresso = await cursosService.listarProgresso(cursoId, perfilId);
    if (progresso === null) return c.json({ error: 'Inscrição não encontrada' }, 404);
    return c.json(progresso);
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
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
      const item = await cursosService.marcarItem(cursoId, itemId, perfilId, user.id, c.req.valid('json').concluido);
      return c.json(item);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 403) return c.json({ error: 'Inscrição não encontrada' }, 403);
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  },
);
