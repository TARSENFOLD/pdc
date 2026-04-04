import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };

const simQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  tipo: z.coerce.number().int().min(1).max(3).optional(),
});

const iniciarSchema = z.object({
  simulacaoId: z.string().min(1),
});

const concluirSchema = z.object({
  score: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const simulacaoRoutes = new Hono<Vars>();

simulacaoRoutes.use('*', verifyJwt);

// GET /simulacoes
simulacaoRoutes.get('/', zValidator('query', simQuerySchema), async (c) => {
  const q = c.req.valid('query');
  const params: Record<string, string> = { populate: 'capa' };
  if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
  if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
  if (q.search !== undefined) params['filters[titulo][$containsi]'] = q.search;
  if (q.tipo !== undefined) params['filters[tipo][$eq]'] = q.tipo.toString();
  try {
    const data = await strapiGet<unknown>('/simulacoes', params);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /simulacoes/me/tentativas — deve vir antes de /:id
simulacaoRoutes.get('/me/tentativas', async (c) => {
  const { id } = c.get('user');
  try {
    const data = await strapiGet<unknown>('/tentativas', {
      'filters[alunoId][$eq]': id,
      populate: 'simulacao',
      'sort': 'createdAt:desc',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /simulacoes/:id
simulacaoRoutes.get('/:id', async (c) => {
  const simId = c.req.param('id');
  try {
    const data = await strapiGet<unknown>(`/simulacoes/${simId}`, { populate: 'capa' });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// POST /simulacoes/tentativas — iniciar tentativa (aluno apenas)
simulacaoRoutes.post('/tentativas', checkRole(['aluno']), zValidator('json', iniciarSchema), async (c) => {
  const { id: alunoId } = c.get('user');
  const { simulacaoId } = c.req.valid('json');
  try {
    const data = await strapiPost<unknown>('/tentativas', {
      simulacaoId,
      alunoId,
      dataInicio: new Date().toISOString(),
    });
    return c.json(data, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// PUT /simulacoes/tentativas/:id — concluir tentativa (aluno apenas)
simulacaoRoutes.put('/tentativas/:id', checkRole(['aluno']), zValidator('json', concluirSchema), async (c) => {
  const tentativaId = c.req.param('id');
  const body = c.req.valid('json');
  try {
    const data = await strapiPut<unknown>(`/tentativas/${tentativaId}`, {
      ...body,
      dataFim: new Date().toISOString(),
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});
