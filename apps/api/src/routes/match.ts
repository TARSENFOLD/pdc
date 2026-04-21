import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };
export const matchRoutes = new Hono<Vars>();

matchRoutes.use('*', verifyJwt);

/**
 * GET /match/sugestoes (G15-T5)
 * Lista sugestões personalizadas para o estudante logado.
 */
matchRoutes.get('/sugestoes', async (c) => {
  const { id: userId } = c.get('user');

  try {
    // 1. Resolver perfilId do estudante
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id'
    });
    const perfilId = resPerfil.data[0]?.id;
    if (!perfilId) return c.json({ error: 'Perfil não encontrado' }, 404);

    // 2. Buscar sugestões não expiradas e não vistas
    const now = new Date().toISOString();
    const resSugestoes = await strapiGet<unknown>('/match-suggestions', {
      'filters[estudante][id][$eq]': String(perfilId),
      'filters[expiraEm][$gt]': now,
      'sort': 'score:desc',
      'pagination[limit]': '50',
      'populate': '*' // Em produção, seríamos mais seletivos
    });

    return c.json(resSugestoes);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});
