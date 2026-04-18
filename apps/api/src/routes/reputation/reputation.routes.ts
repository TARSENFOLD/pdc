import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../../modules/auth/auth.middleware.js';
import * as reputationService from '../../modules/reputation/reputation.service.js';
import { strapiGet } from '../../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };

export const reputationRoutes = new Hono<Vars>();

reputationRoutes.use('*', verifyJwt);

// GET /reputation/me
reputationRoutes.get('/me', async (c) => {
  const { id } = c.get('user');
  const score = await reputationService.getReputacao(id);
  return c.json({ score });
});

// GET /reputation/:perfilId
reputationRoutes.get('/:perfilId', async (c) => {
  const perfilId = c.req.param('perfilId');
  const score = await reputationService.getReputacao(perfilId);
  return c.json({ score });
});

interface StrapiCountMeta { meta: { pagination: { total: number } } }

// GET /reputation/:perfilId/breakdown
reputationRoutes.get('/:perfilId/breakdown', async (c) => {
  const perfilId = c.req.param('perfilId');
  
  try {
    const [
      perfil,
      cursos,
      sims,
      conquistas,
      comentarios,
      ratingsGiven,
    ] = await Promise.all([
      strapiGet<{ data: { reputacao?: number; createdAt: string } }>(`/perfis/${perfilId}`, { populate: '*' }),
      strapiGet<StrapiCountMeta>('/cursos', { 'filters[autor][id][$eq]': perfilId, 'pagination[pageSize]': '1' }),
      strapiGet<StrapiCountMeta>('/simulacoes', { 'filters[autor][id][$eq]': perfilId, 'pagination[pageSize]': '1' }),
      strapiGet<StrapiCountMeta>('/conquistas', { 'filters[perfis][id][$eq]': perfilId, 'pagination[pageSize]': '1' }),
      strapiGet<StrapiCountMeta>('/comments', { 'filters[autor][id][$eq]': perfilId, 'pagination[pageSize]': '1' }),
      strapiGet<StrapiCountMeta>('/ratings', { 'filters[autor][id][$eq]': perfilId, 'pagination[pageSize]': '1' }),
    ]);

    const created = new Date(perfil.data.createdAt);
    const meses = Math.max(0, Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30)));

    const breakdown = {
      ratingsMedia: perfil.data.reputacao ?? 0,
      cursosPublicados: cursos.meta.pagination.total,
      simulacoes: sims.meta.pagination.total,
      conquistas: conquistas.meta.pagination.total,
      tempoPlataforma: meses,
      engagement: comentarios.meta.pagination.total + ratingsGiven.meta.pagination.total,
    };

    return c.json(breakdown);
  } catch {
    return c.json({ error: 'Erro ao calcular breakdown' }, 502);
  }
});
