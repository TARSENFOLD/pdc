import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };

export const rankingRoutes = new Hono<Vars>();

rankingRoutes.use('*', verifyJwt);

/**
 * GET /ranking
 * Retorna os top 50 perfis ordenados por reputação DESC (leaderboard global).
 * Acessível por qualquer utilizador autenticado.
 */
rankingRoutes.get('/', async (c) => {
  try {
    const res = await strapiGet<{
      id: string;
      nome: string;
      avatarUrl?: string;
      xp: number;
      reputacao: number;
      role: string;
    }>('/perfis', {
      'sort': 'reputacao:desc',
      'pagination[pageSize]': '50',
      'fields[0]': 'id',
      'fields[1]': 'nome',
      'fields[2]': 'avatarUrl',
      'fields[3]': 'xp',
      'fields[4]': 'reputacao',
      'fields[5]': 'role',
    });

    return c.json({ data: res.data });
  } catch {
    return c.json({ data: [] });
  }
});
