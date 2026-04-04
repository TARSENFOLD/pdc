import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost } from '../modules/strapi/strapi.client.js';

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
  const params: Record<string, string> = { populate: 'capa,autor' };
  if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
  if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
  if (q.search !== undefined) params['filters[titulo][$containsi]'] = q.search;
  if (q.categoria !== undefined) params['filters[categoria][$eq]'] = q.categoria;
  if (q.autorId !== undefined) params['filters[autorId][$eq]'] = q.autorId;
  try {
    const data = await strapiGet<unknown>('/cursos', params);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /cursos/me/inscricoes — deve vir antes de /:id
cursoRoutes.get('/me/inscricoes', async (c) => {
  const { id } = c.get('user');
  try {
    const data = await strapiGet<unknown>('/inscricoes', {
      'filters[alunoId][$eq]': id,
      populate: 'curso.capa',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /cursos/:id
cursoRoutes.get('/:id', async (c) => {
  const cursoId = c.req.param('id');
  try {
    const data = await strapiGet<unknown>(`/cursos/${cursoId}`, {
      populate: 'capa,autor,modulos.itens',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// POST /cursos/:id/inscricao — aluno apenas
cursoRoutes.post('/:id/inscricao', checkRole(['aluno']), async (c) => {
  const cursoId = c.req.param('id');
  const { id: alunoId } = c.get('user');
  try {
    const data = await strapiPost<unknown>('/inscricoes', {
      cursoId,
      alunoId,
      dataInscricao: new Date().toISOString(),
      concluido: false,
      progressoPercentagem: 0,
    });
    return c.json(data, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});
