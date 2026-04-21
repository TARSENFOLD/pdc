import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../../modules/auth/auth.middleware.js';
import { strapiGet } from '../../modules/strapi/strapi.client.js';
import { getReputacaoBreakdown } from '../../modules/reputation/reputation.service.js';

type Vars = { Variables: AuthVariables };
export const reputationRoutes = new Hono<Vars>();

reputationRoutes.use('*', verifyJwt);

// GET /reputation/me
reputationRoutes.get('/me', async (c) => {
  const { id: userId } = c.get('user');

  try {
    // 1. Buscar perfilId real do usuário
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    
    const perfil = resPerfil.data[0];
    if (!perfil) return c.json({ error: 'Perfil não encontrado' }, 404);

    // 2. Calcular breakdown de m\C3\A9rito (M\C3\BAsculo)
    const breakdown = await getReputacaoBreakdown(perfil.id);

    return c.json({
      data: breakdown,
      meta: {
        timestamp: new Date().toISOString(),
        verified: true,
      }
    });
  } catch (_err) {
    return c.json({ error: 'Erro ao carregar reputa\C3\A7\C3\A3o' }, 502);
  }
});

// GET /reputation/:perfilId — para visualiza\C3\A7\C3\A3o p\C3\BAblica de m\C3\A9rito
reputationRoutes.get('/:perfilId', async (c) => {
  const perfilId = c.req.param('perfilId');

  try {
    const resPerfil = await strapiGet<{ reputacao?: number; createdAt: string }> (`/perfis/${perfilId}`, {
      'fields[0]': 'reputacao',
      'fields[1]': 'createdAt'
    });

    const perfil = resPerfil.data[0];
    if (!perfil) return c.json({ error: 'Perfil n\C3\A3o encontrado' }, 404);

    const created = new Date(perfil.createdAt);
    const months = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30);

    return c.json({
      data: {
        score: perfil.reputacao ?? 0,
        ratingsMedia: perfil.reputacao ?? 0, // Placeholder at\C3\A9 termos mais dados p\C3\BAblicos
        veteraniaMeses: Math.floor(months),
      }
    });
  } catch (_err) {
    return c.json({ error: 'Erro ao carregar reputa\C3\A7\C3\A3o p\C3\BAblica' }, 502);
  }
});
