import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiDelete } from '../modules/strapi/strapi.client.js';
import { type Projeto } from '@pdc/shared';

type Vars = { Variables: AuthVariables };
export const projetoRoutes = new Hono<Vars>();

projetoRoutes.use('*', verifyJwt);

// GET /projetos
projetoRoutes.get('/', async (c) => {
  try {
    const res = await strapiGet<Projeto>('/projetos', {
      populate: 'autor,media',
      sort: 'createdAt:desc'
    });
    return c.json(res);
  } catch (err) {
    return c.json({ error: 'Falha ao sincronizar o ecossistema de projetos' }, 502);
  }
});

// GET /projetos/meus
projetoRoutes.get('/meus', async (c) => {
  const { id: userId } = c.get('user');
  try {
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id'
    });
    const perfilId = resPerfil.data[0]?.id;
    if (!perfilId) return c.json({ error: 'Identidade não localizada' }, 404);

    const res = await strapiGet<Projeto>('/projetos', {
      'filters[autor][id][$eq]': String(perfilId),
      populate: 'media',
    });
    return c.json(res);
  } catch (err) {
    return c.json({ error: 'Erro ao recuperar os teus ativos' }, 502);
  }
});

// DELETE /projetos/:id
projetoRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { id: userId } = c.get('user');

  try {
    const resGet = await strapiGet<any>(`/projetos/${id}`, { populate: 'autor' });
    const existing = resGet.data[0];

    if (!existing) return c.json({ error: 'Projeto não identificado' }, 404);

    // Invariante: apenas o autor real pode eliminar o ativo
    if (existing.autor?.userId !== userId) {
      return c.json({ error: 'Autoridade insuficiente' }, 403);
    }

    await strapiDelete(`/projetos/${id}`);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Falha na eliminação do ativo' }, 502);
  }
});
