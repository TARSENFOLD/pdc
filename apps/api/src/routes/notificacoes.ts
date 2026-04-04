import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };

export const notificacaoRoutes = new Hono<Vars>();

notificacaoRoutes.use('*', verifyJwt);

// GET /notificacoes — lista notificações do utilizador autenticado
notificacaoRoutes.get('/', async (c) => {
  const { id } = c.get('user');
  try {
    const data = await strapiGet<unknown>('/notificacoes', {
      'filters[userId][$eq]': id,
      'sort': 'createdAt:desc',
      'pagination[pageSize]': '50',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /notificacoes/contador — contagem de não lidas
notificacaoRoutes.get('/contador', async (c) => {
  const { id } = c.get('user');
  try {
    const [all, unread] = await Promise.all([
      strapiGet<{ meta: { pagination: { total: number } } }>('/notificacoes', {
        'filters[userId][$eq]': id,
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ meta: { pagination: { total: number } } }>('/notificacoes', {
        'filters[userId][$eq]': id,
        'filters[lida][$eq]': 'false',
        'pagination[pageSize]': '1',
      }),
    ]);
    return c.json({
      total: all.meta.pagination.total,
      naoLidas: unread.meta.pagination.total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// PUT /notificacoes/:id/lida — marcar como lida
notificacaoRoutes.put('/:id/lida', async (c) => {
  const notifId = c.req.param('id');
  try {
    const data = await strapiPut<unknown>(`/notificacoes/${notifId}`, { lida: true });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// PUT /notificacoes/lidas/todas — marcar todas como lidas
notificacaoRoutes.put('/lidas/todas', async (c) => {
  const { id } = c.get('user');
  try {
    const data = await strapiPost<unknown>('/notificacoes/marcar-todas-lidas', { userId: id });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});
