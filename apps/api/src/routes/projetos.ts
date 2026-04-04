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
  alunoId: z.string().optional(),
  cursoId: z.string().optional(),
  tags: z.string().optional(), // comma-separated
});

const createSchema = z.object({
  titulo: z.string().min(3).max(120),
  descricao: z.string().min(10).max(2000),
  cursoId: z.string().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  imagemUrl: z.string().url().optional(),
  repoUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
});

const updateSchema = createSchema.partial();

export const projetoRoutes = new Hono<Vars>();

// GET /projetos — público
projetoRoutes.get('/', zValidator('query', listQuerySchema), async (c) => {
  const q = c.req.valid('query');
  const params: Record<string, string> = { populate: 'imagem,aluno' };
  if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
  if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
  if (q.alunoId !== undefined) params['filters[alunoId][$eq]'] = q.alunoId;
  if (q.cursoId !== undefined) params['filters[cursoId][$eq]'] = q.cursoId;
  if (q.tags !== undefined) params['filters[tags][$containsi]'] = q.tags;
  try {
    return c.json(await strapiGet<unknown>('/projetos', params));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// GET /projetos/:id — público
projetoRoutes.get('/:id', async (c) => {
  try {
    return c.json(await strapiGet<unknown>(`/projetos/${c.req.param('id')}`, { populate: 'imagem,aluno' }));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// POST /projetos — aluno
projetoRoutes.post(
  '/',
  verifyJwt,
  checkRole(['aluno']),
  zValidator('json', createSchema),
  async (c) => {
    const { id: alunoId } = c.get('user');
    const body = c.req.valid('json');
    try {
      return c.json(await strapiPost<unknown>('/projetos', { ...body, alunoId }), 201);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

// PUT /projetos/:id — próprio aluno
projetoRoutes.put('/:id', verifyJwt, zValidator('json', updateSchema), async (c) => {
  const projetoId = c.req.param('id');
  const { id: userId } = c.get('user');
  const body = c.req.valid('json');
  // Verifica propriedade
  try {
    const proj = await strapiGet<{ data: { attributes: { alunoId: string } } }>(`/projetos/${projetoId}`);
    if (proj.data.attributes.alunoId !== userId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    return c.json(await strapiPut<unknown>(`/projetos/${projetoId}`, body));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// DELETE /projetos/:id — aluno (próprio) ou moderador
projetoRoutes.delete('/:id', verifyJwt, async (c) => {
  const projetoId = c.req.param('id');
  const { id: userId, role } = c.get('user');
  try {
    const proj = await strapiGet<{ data: { attributes: { alunoId: string } } }>(`/projetos/${projetoId}`);
    const ehDono = proj.data.attributes.alunoId === userId;
    const ehModerador = role === 'moderador' || role === 'super_admin';
    if (!ehDono && !ehModerador) return c.json({ error: 'Forbidden' }, 403);
    // Strapi v4 delete
    const res = await fetch(
      `${process.env['STRAPI_URL'] ?? 'http://localhost:1337'}/api/projetos/${projetoId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${process.env['STRAPI_API_TOKEN'] ?? ''}` },
      }
    );
    if (!res.ok) throw new Error(`Strapi DELETE falhou: ${res.status.toString()}`);
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});
