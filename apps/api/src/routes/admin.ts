import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost, strapiPutRaw } from '../modules/strapi/strapi.client.js';
import { RoleSchema } from '@pdc/shared';

type Vars = { Variables: AuthVariables };

const paginacaoSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const roleBodySchema = z.object({
  role: RoleSchema,
});

export const adminRoutes = new Hono<Vars>();

adminRoutes.use('*', verifyJwt);

// GET /admin/utilizadores — super_admin
adminRoutes.get(
  '/utilizadores',
  checkRole(['super_admin']),
  zValidator('query', paginacaoSchema),
  async (c) => {
    const q = c.req.valid('query');
    const params: Record<string, string> = { populate: 'perfil' };
    if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
    if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
    try {
      return c.json(await strapiGet<unknown>('/users', params));
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

// PUT /admin/utilizadores/:id/role — super_admin
adminRoutes.put(
  '/utilizadores/:id/role',
  checkRole(['super_admin']),
  zValidator('json', roleBodySchema),
  async (c) => {
    const id = c.req.param('id');
    const { role } = c.req.valid('json');
    try {
      const data = await strapiPutRaw<unknown>(`/users/${id}`, { role });
      
      await strapiPost('/audit-logs', { 
        userId: c.get('user').id, 
        accao: 'admin_alterar_role', 
        recurso: `/users/${id}`, 
        ip: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown', 
        timestamp: new Date().toISOString() 
      }).catch(() => {});
      
      return c.json(data);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

// PUT /admin/utilizadores/:id/suspender — super_admin, moderador
adminRoutes.put(
  '/utilizadores/:id/suspender',
  checkRole(['super_admin', 'moderador']),
  async (c) => {
    const id = c.req.param('id');
    try {
      const data = await strapiPutRaw<unknown>(`/users/${id ?? ''}`, {
        bloqueado: true,
        suspendidoEm: new Date().toISOString(),
      });
      return c.json(data);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

// GET /admin/stats — super_admin, moderador
adminRoutes.get('/stats', checkRole(['super_admin', 'moderador']), async (c) => {
  try {
    const [utilizadores, simulacoes, cursos, denuncias] = await Promise.all([
      strapiGet<{ meta: { pagination: { total: number } } }>('/users', {
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ meta: { pagination: { total: number } } }>('/simulacoes', {
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ meta: { pagination: { total: number } } }>('/cursos', {
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ meta: { pagination: { total: number } } }>('/denuncias', {
        'filters[estado][$eq]': 'pendente',
        'pagination[pageSize]': '1',
      }),
    ]);
    return c.json({
      totalUtilizadores: utilizadores.meta.pagination.total,
      totalSimulacoes: simulacoes.meta.pagination.total,
      totalCursos: cursos.meta.pagination.total,
      denunciasPendentes: denuncias.meta.pagination.total,
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// GET /admin/audit — super_admin
adminRoutes.get(
  '/audit',
  checkRole(['super_admin']),
  zValidator('query', paginacaoSchema),
  async (c) => {
    const q = c.req.valid('query');
    const params: Record<string, string> = {};
    if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
    if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
    try {
      return c.json(await strapiGet<unknown>('/audit-logs', params));
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

// PUT /admin/utilizadores/:id/reativar (roles: super_admin)
adminRoutes.put(
  '/utilizadores/:id/reativar',
  checkRole(['super_admin']),
  async (c) => {
    const id = c.req.param('id');
    try {
      const data = await strapiPutRaw<unknown>(`/users/${id}`, {
        bloqueado: false,
        suspendidoEm: null,
      });
      await strapiPost('/audit-logs', {
        userId: c.get('user').id,
        accao: 'admin_reativar_utilizador',
        recurso: `/users/${id}`,
        ip: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
        timestamp: new Date().toISOString(),
      }).catch(() => {});
      return c.json(data);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

// GET /admin/telemetria (roles: super_admin)
adminRoutes.get(
  '/telemetria',
  checkRole(['super_admin']),
  zValidator('query', paginacaoSchema.extend({ tipo: z.string().optional() })),
  async (c) => {
    const q = c.req.valid('query');
    const params: Record<string, string> = {
      'sort': 'createdAt:desc',
    };
    if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
    if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
    if (q.tipo) params['filters[tipo][$eq]'] = q.tipo;
    try {
      return c.json(await strapiGet<unknown>('/telemetrias', params));
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

// GET /admin/relatorios/retencao (roles: super_admin)
adminRoutes.get(
  '/relatorios/retencao',
  checkRole(['super_admin']),
  async (c) => {
    try {
      const [totalAlunos, alunosAtivos, telemetria] = await Promise.all([
        strapiGet<{ meta: { pagination: { total: number } } }>('/users', {
          'filters[role][$eq]': 'aluno',
          'pagination[pageSize]': '1',
        }),
        strapiGet<{ meta: { pagination: { total: number } } }>('/telemetrias', {
          'filters[tipo][$eq]': 'session.start',
          'pagination[pageSize]': '1',
        }),
        strapiGet<{ data: Array<{ tipo?: string; payload?: unknown }> }>('/telemetrias', {
          'pagination[pageSize]': '100',
          'sort': 'createdAt:desc',
        }),
      ]);

      const total = totalAlunos.meta.pagination.total;
      const ativos = alunosAtivos.meta.pagination.total;
      const semDados = total === 0 && ativos === 0;

      return c.json({
        totalAlunos: total,
        alunosAtivos: ativos,
        taxaRetencao: total > 0 ? Math.round((ativos / total) * 100) : 0,
        semDados,
        totalEventos: telemetria.data.length,
      });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);
