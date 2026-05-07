import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../../modules/auth/auth.middleware.js';
import { checkRole } from '../../modules/auth/rbac.middleware.js';
import { strapiGet } from '../../modules/strapi/strapi.client.js';
import type { Denuncia, ModeradorDashboard, StrapiListResponse } from '@pdc/shared';

type Vars = { Variables: AuthVariables };

export const dashboardModeradorRoutes = new Hono<Vars>();

dashboardModeradorRoutes.use('*', verifyJwt, checkRole(['moderador', 'super_admin']));

dashboardModeradorRoutes.get('/', async (c) => {
  try {
    const todayStart = startOfTodayIso();
    const [pendentes, resolvidasHoje, recentes] = await Promise.all([
      strapiGet<Denuncia>('/denuncias', {
        'filters[estado][$eq]': 'pendente',
        'sort': 'criadaEm:desc',
        'pagination[pageSize]': '5',
      }),
      strapiGet<Denuncia>('/denuncias', {
        'filters[estado][$eq]': 'resolvida',
        'filters[resolvidaEm][$gte]': todayStart,
        'pagination[pageSize]': '1',
      }),
      strapiGet<Denuncia>('/denuncias', {
        'sort': 'criadaEm:desc',
        'pagination[pageSize]': '100',
      }),
    ]);

    const totalRecentes = recentes.meta.pagination.total;
    const totalResolvidas = countByEstado(recentes, 'resolvida');
    const dashboard: ModeradorDashboard = {
      stats: {
        denunciasPendentes: pendentes.meta.pagination.total,
        resolvidasHoje: resolvidasHoje.meta.pagination.total,
        taxaResolucao: totalRecentes > 0 ? Math.round((totalResolvidas / totalRecentes) * 100) : 0,
      },
      denunciasCriticas: pendentes.data,
    };

    return c.json(dashboard);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

function startOfTodayIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function countByEstado(response: StrapiListResponse<Denuncia>, estado: Denuncia['estado']): number {
  return response.data.filter((denuncia) => denuncia.estado === estado).length;
}
