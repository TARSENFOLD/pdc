import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { CONTENT_ACCESS_ERRORS } from '../modules/conteudo/content-access.service.js';
export const experienciaStatsRoutes = new Hono<{ Variables: AuthVariables }>();
// GET /experiencias/stats — protegido
experienciaStatsRoutes.get(
  '/stats',
  verifyJwt,
  checkRole(['instituicao', 'super_admin']),
  async (c) => {
    const { id: userId } = c.get('user');
    try {
      const contentParams: Record<string, string | string[]> = {
        'filters[autor][userId][$eq]': userId,
        'pagination[pageSize]': '1',
      };
      const [experiencias, cursos, simulacoes, programas, inscricoes, participacoes] =
        await Promise.all([
          strapiGet<{ id: string }>('/experiencias', contentParams),
          strapiGet<{ id: string }>('/cursos', {
            'filters[autorId][$eq]': userId,
            'pagination[pageSize]': '1',
          }),
          strapiGet<{ id: string }>('/simulacoes', {
            'filters[autorId][$eq]': userId,
            'pagination[pageSize]': '1',
          }),
          strapiGet<{ id: string }>('/programas', {
            'filters[responsavel][userId][$eq]': userId,
            'pagination[pageSize]': '1',
          }),
          strapiGet<{ id: string }>('/inscricoes', {
            'filters[curso][autorId][$eq]': userId,
            'pagination[pageSize]': '1',
          }),
          strapiGet<{ id: string }>('/experiencia-participantes', {
            'filters[experiencia][autor][userId][$eq]': userId,
            'pagination[pageSize]': '1',
          }),
        ]);

      const totals = {
        experiencias: experiencias.meta.pagination.total,
        cursos: cursos.meta.pagination.total,
        simulacoes: simulacoes.meta.pagination.total,
        programas: programas.meta.pagination.total,
        inscricoes: inscricoes.meta.pagination.total,
        participacoes: participacoes.meta.pagination.total,
      };
      const hasInvalidTotal = Object.values(totals).some(
        (total) => !Number.isInteger(total) || total < 0
      );
      if (hasInvalidTotal) {
        return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
      }

      return c.json({
        conteudosTotais: totals.experiencias + totals.cursos + totals.simulacoes + totals.programas,
        inscricoesTotais: totals.inscricoes,
        participacoesTotais: totals.participacoes,
      });
    } catch {
      return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
    }
  }
);
