import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiPost, strapiDelete } from '../modules/strapi/strapi.client.js';
import { type Projeto } from '@pdc/shared';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';

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
  } catch (_err) {
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
  } catch (_err) {
    return c.json({ error: 'Erro ao recuperar os teus ativos' }, 502);
  }
});

// POST /projetos
projetoRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const { id: userId } = c.get('user');

  try {
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id'
    });
    const perfilId = resPerfil.data[0]?.id;
    if (!perfilId) return c.json({ error: 'Identidade não localizada' }, 404);

    const res = await strapiPost<Projeto>('/projetos', {
      ...body,
      autor: perfilId,
    });

    const projetoId = res.data.id;

    // G15: Impacto no Ecossistema
    await eventBus.publishWithOutbox(DomainEventName.PROJETO_PUBLICADO, {
      projetoId,
      autorId: String(perfilId),
      titulo: body.titulo,
      area: body.area
    });

    return c.json(res.data, 201);
  } catch (_err) {
    return c.json({ error: 'Falha na publicação do projeto' }, 502);
  }
});

interface StrapiProjetoWithAutor {
  id: string | number;
  autor?: { userId: string };
}

// DELETE /projetos/:id
projetoRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { id: userId } = c.get('user');

  try {
    const resGet = await strapiGet<StrapiProjetoWithAutor>(`/projetos/${id}`, { populate: 'autor' });
    const existing = resGet.data[0];

    if (!existing) return c.json({ error: 'Projeto não identificado' }, 404);

    // Invariante: apenas o autor real pode eliminar o ativo
    if (existing.autor?.userId !== userId) {
      return c.json({ error: 'Autoridade insuficiente' }, 403);
    }

    await strapiDelete(`/projetos/${id}`);
    return c.json({ success: true });
  } catch (_err) {
    return c.json({ error: 'Falha na eliminação do ativo' }, 502);
  }
});
