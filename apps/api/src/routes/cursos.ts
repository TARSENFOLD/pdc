import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { CriarCursoPayloadSchema, type CriarCursoPayload, Curso, Inscricao, BehaviorPattern } from '@pdc/shared';
import { cursosService } from '../modules/cursos/cursos.service.js';

type Vars = { Variables: AuthVariables };

const cursoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  categoria: z.string().optional(),
  autorId: z.string().optional(),
});

export const cursoRoutes = new Hono<Vars>();

cursoRoutes.use('*', verifyJwt);

// GET /cursos
cursoRoutes.get('/', zValidator('query', cursoQuerySchema), async (c) => {
  const q = c.req.valid('query');
  const user = c.get('user');
  
  const params: Record<string, string | string[]> = { populate: 'capa,autor', 'filters[estado][$eq]': 'published' };
  if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
  if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
  if (q.search !== undefined) params['filters[titulo][$containsi]'] = q.search;

  try {
    const res = await strapiGet<Curso>('/cursos', params);
    
    if (user.role === 'estudante') {
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
      return c.json({ ...res, data: enrichedData });
    }
    return c.json(res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /cursos/meus
cursoRoutes.get('/meus', checkRole(['mentor', 'instituicao', 'super_admin']), async (c) => {
  try {
      const res = await strapiGet<Curso>('/cursos', { 'filters[autorId][$eq]': c.get('user').id, populate: 'capa', 'pagination[page]': c.req.query('page') || '1' });
      return c.json({ data: res.data, pagination: res.meta.pagination });
    } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
});

// GET /cursos/me/inscricoes
cursoRoutes.get('/me/inscricoes', async (c) => {
  try {
    const res = await strapiGet<Inscricao>('/inscricoes', { 'filters[estudanteId][$eq]': c.get('user').id, populate: 'curso.capa' });
    return c.json(res);
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// GET /cursos/:id
cursoRoutes.get('/:id', async (c) => {
  try {
    const res = await strapiGet<Curso>(`/cursos/${c.req.param('id')}`, { populate: 'capa,autor,modulos.itens' });
    const data = res.data[0];
    if (!data) return c.json({ error: 'Curso não encontrado' }, 404);

    const user = c.get('user');
    if (data.estado !== 'published' && data.autorId !== user.id && !['moderador', 'super_admin'].includes(user.role)) {
      return c.json({ error: 'Acesso negado' }, 403);
    }
    return c.json(res);
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// POST /cursos
cursoRoutes.post('/', checkRole(['mentor', 'instituicao', 'super_admin']), zValidator('json', CriarCursoPayloadSchema), async (c) => {
  try {
    const curso = await cursosService.criarCursoCompleto(c.req.valid('json'), c.get('user').id);
    return c.json(curso, 201);
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// PUT /cursos/:id
cursoRoutes.put('/:id', checkRole(['mentor', 'instituicao', 'super_admin']), zValidator('json', CriarCursoPayloadSchema.partial()), async (c) => {
  try {
    const resGet = await strapiGet<Curso>(`/cursos/${c.req.param('id')}`);
    const curso = resGet.data[0];
    if (!curso) return c.json({ error: 'Curso não encontrado' }, 404);
    
    if (curso.autorId !== c.get('user').id && !['moderador', 'super_admin'].includes(c.get('user').role)) {
      return c.json({ error: 'Não tem permissão' }, 403);
    }

    const resPut = await cursosService.atualizarCurso(c.req.param('id'), c.req.valid('json') as Partial<CriarCursoPayload>, c.get('user').id);
    return c.json(resPut);
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// PATCH /cursos/:id/estado
cursoRoutes.patch('/:id/estado', checkRole(['mentor', 'instituicao', 'moderador', 'super_admin']), zValidator('json', z.object({ estado: z.enum(['review', 'published', 'archived']) })), async (c) => {
  try {
    const resGet = await strapiGet<Curso>(`/cursos/${c.req.param('id')}`);
    const curso = resGet.data[0];
    if (!curso) return c.json({ error: 'Curso não encontrado' }, 404);

    const podeEditar = c.get('user').id === curso.autorId || ['moderador', 'super_admin'].includes(c.get('user').role);
    if (!podeEditar) return c.json({ error: 'Sem permissão' }, 403);

    await cursosService.alterarEstado(c.req.param('id'), c.req.valid('json').estado, curso.autorId);
    return c.json({ success: true });
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// POST /cursos/:id/inscricao
cursoRoutes.post('/:id/inscricao', checkRole(['estudante']), async (c) => {
  try {
    const res = await cursosService.inscreverEstudante(c.req.param('id') as string, c.get('user').id);
    return c.json(res, 201);
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});
