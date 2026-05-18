import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { rateLimitDenuncias } from '../middleware/rateLimit.js';
import { toPaginatedResponse } from './pagination.js';
import { writeAuditLog } from '../middleware/audit.js';

type Vars = { Variables: AuthVariables };

const createSchema = z.object({
  conteudoId: z.string().min(1),
  conteudoTipo: z.string().min(1),
  motivo: z.string().min(10).max(1000),
});

const listQuerySchema = z.object({
  estado: z.enum(['pendente', 'em_analise', 'resolvida']).optional(),
  tipo: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const resolverSchema = z.object({
  accao: z.enum(['remover', 'avisar', 'ignorar']),
  nota: z.string().min(1).max(500),
});

export const denunciaRoutes = new Hono<Vars>();

denunciaRoutes.use('*', verifyJwt);

// POST /denuncias — qualquer utilizador autenticado pode denunciar
denunciaRoutes.post('/', rateLimitDenuncias, zValidator('json', createSchema), async (c) => {
  const { id: denuncianteId } = c.get('user');
  const body = c.req.valid('json');
  try {
    const data = await strapiPost<unknown>('/denuncias', {
      ...body,
      denuncianteId,
      estado: 'pendente',
      criadaEm: new Date().toISOString(),
    });
    return c.json(data, 201);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// GET /denuncias — moderadores e super_admin
denunciaRoutes.get(
  '/',
  checkRole(['moderador', 'super_admin']),
  zValidator('query', listQuerySchema),
  async (c) => {
    const q = c.req.valid('query');
    const params: Record<string, string> = { populate: 'denunciante' };
    if (q.estado !== undefined) params['filters[estado][$eq]'] = q.estado;
    if (q.tipo !== undefined) params['filters[conteudoTipo][$eq]'] = q.tipo;
    if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
    if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
    try {
      const res = await strapiGet<unknown>('/denuncias', params);
      return c.json(toPaginatedResponse(res));
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

// GET /denuncias/:id — moderadores e super_admin
denunciaRoutes.get('/:id', checkRole(['moderador', 'super_admin']), async (c) => {
  const id = c.req.param('id');
  try {
    return c.json(
      await strapiGet<unknown>(`/denuncias/${id ?? ''}`, { populate: 'denunciante' })
    );
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// PUT /denuncias/:id/resolver — moderadores e super_admin
denunciaRoutes.put(
  '/:id/resolver',
  checkRole(['moderador', 'super_admin']),
  zValidator('json', resolverSchema),
  async (c) => {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    try {
      const data = await strapiPut<unknown>(`/denuncias/${id}`, {
        estado: 'resolvida',
        accao: body.accao,
        nota: body.nota,
      });

      await writeAuditLog({
        actor: c.get('user'),
        accao: 'denuncia_resolver', 
        recurso: `/denuncias/${id}`, 
        ip: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
        userAgent: c.req.header('user-agent'),
        detalhes: { accao: body.accao, nota: body.nota },
      }).catch(() => {});

      return c.json(data);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);
