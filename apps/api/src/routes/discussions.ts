import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';

// Definições de tipo locais (Flat v5)
interface StrapiReply {
  id: string | number;
  conteudo: string;
  autor?: {
    nome: string;
    avatarUrl?: string;
  };
}

export const discussionsRoutes = new Hono<{ Variables: AuthVariables }>();
discussionsRoutes.use('*', verifyJwt);

/**
 * GET /discussions/:id/replies
 * Carrega as respostas de uma discussão com autor populado.
 */
discussionsRoutes.get('/:id/replies', async (c) => {
  const id = c.req.param('id');
  try {
    const res = await strapiGet<StrapiReply>(`/replies`, {
      'filters[discussion][id][$eq]': id,
      'populate': 'autor'
    });
    
    // Os dados já vêm planos do strapiGet (normalize)
    return c.json({ data: res.data });
  } catch (_err) {
    return c.json({ error: 'Falha ao carregar respostas' }, 502);
  }
});
