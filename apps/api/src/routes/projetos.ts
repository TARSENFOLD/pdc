import { Hono } from 'hono';
import { strapiGet, strapiDelete } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';

type Vars = { Variables: AuthVariables };
export const projetoRoutes = new Hono<Vars>();

// ─── Rotas Públicas ──────────────────────────────────────────────────────────

// GET /projetos — Galeria de evidências
projetoRoutes.get('/', async (c) => {
  try {
    const data = await strapiGet<any>('/projetos', {
      populate: 'autor,capa',
      'filters[visibilidade][$eq]': 'publico'
    });
    return c.json(data);
  } catch (err) {
    return c.json({ error: 'Erro ao carregar galeria de projectos' }, 502);
  }
});

// GET /projetos/:id
projetoRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const data = await strapiGet<any>(`/projetos/${id}`, {
      populate: 'autor,capa,colaboradores'
    });
    return c.json(data);
  } catch (err) {
    return c.json({ error: 'Projecto não encontrado' }, 404);
  }
});

// ─── Rotas Protegidas ─────────────────────────────────────────────────────────

projetoRoutes.use('*', verifyJwt);

// GET /projetos/meus
projetoRoutes.get('/me/list', async (c) => {
  try {
    const perfil = await strapiGet<{ data: any }>('/perfis/me');
    const data = await strapiGet<any>('/projetos', {
      'filters[autor][id][$eq]': perfil.data.id,
      populate: 'capa'
    });
    return c.json(data);
  } catch (err) {
    return c.json({ error: 'Erro ao carregar os tuas projectos' }, 502);
  }
});

// DELETE /projetos/:id
projetoRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { id: userId } = c.get('user');

  try {
    // Verificar se é o dono
    const existing = await strapiGet<any>(`/projetos/${id}`, { populate: 'autor' });
    if (existing.data.autor.userId !== userId) {
      return c.json({ error: 'Acesso negado' }, 403);
    }

    await strapiDelete(`/projetos/${id}`);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Erro ao eliminar projecto' }, 502);
  }
});
