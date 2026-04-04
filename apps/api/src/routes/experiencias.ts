import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  instituicaoId: z.string().optional(),
});

const criarSchema = z.object({
  titulo: z.string().min(3).max(200),
  descricao: z.string().min(10),
  capaUrl: z.string().url().optional(),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime().optional(),
});

const atualizarSchema = criarSchema.partial();

export const experienciaRoutes = new Hono<Vars>();

experienciaRoutes.use('*', verifyJwt);

// GET /experiencias
experienciaRoutes.get('/', zValidator('query', listQuerySchema), async (c) => {
  const q = c.req.valid('query');
  const params: Record<string, string> = { populate: 'capa,instituicao' };
  if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
  if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
  if (q.search !== undefined) params['filters[titulo][$containsi]'] = q.search;
  if (q.instituicaoId !== undefined) params['filters[instituicaoId][$eq]'] = q.instituicaoId;
  try {
    const data = await strapiGet<unknown>('/experiencias', params);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /experiencias/:id
experienciaRoutes.get('/:id', async (c) => {
  const expId = c.req.param('id');
  try {
    const data = await strapiGet<unknown>(`/experiencias/${expId}`, {
      populate: 'capa,instituicao',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// POST /experiencias — instituicao apenas
experienciaRoutes.post(
  '/',
  checkRole(['instituicao']),
  zValidator('json', criarSchema),
  async (c) => {
    const { id: instituicaoId } = c.get('user');
    const body = c.req.valid('json');
    try {
      const data = await strapiPost<unknown>('/experiencias', { ...body, instituicaoId });
      return c.json(data, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return c.json({ error: message }, 502);
    }
  }
);

// PUT /experiencias/:id — instituicao apenas
experienciaRoutes.put(
  '/:id',
  checkRole(['instituicao']),
  zValidator('json', atualizarSchema),
  async (c) => {
    const expId = c.req.param('id');
    const body = c.req.valid('json');
    try {
      const data = await strapiPut<unknown>(`/experiencias/${expId}`, body);
      return c.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return c.json({ error: message }, 502);
    }
  }
);
