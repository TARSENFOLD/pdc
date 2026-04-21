import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { CriarExperienciaPayloadSchema, type Experiencia } from '@pdc/shared';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';

type Vars = { Variables: AuthVariables };

interface StrapiExperiencia {
  id: string | number;
  titulo: string;
  instituicaoId: string;
  estado: string;
}

export const experienciaRoutes = new Hono<Vars>();

experienciaRoutes.use('*', verifyJwt);

// GET /experiencias
experienciaRoutes.get('/', async (c) => {
  try {
    const res = await strapiGet<Experiencia>('/experiencias', {
      'filters[estado][$eq]': 'published',
      populate: 'capa,instituicao',
      sort: 'createdAt:desc'
    });
    return c.json(res);
  } catch (_err) {
    return c.json({ error: 'Falha ao sincronizar o catálogo de experiências' }, 502);
  }
});

// GET /experiencias/minhas
experienciaRoutes.get('/minhas', checkRole(['instituicao', 'super_admin']), async (c) => {
  const { id } = c.get('user');
  try {
    const res = await strapiGet<Experiencia>('/experiencias', {
      'filters[instituicaoId][$eq]': id,
      populate: 'capa',
    });
    return c.json(res);
  } catch (_err) {
    return c.json({ error: 'Erro ao recuperar as tuas experiências' }, 502);
  }
});

// POST /experiencias
experienciaRoutes.post('/', 
  checkRole(['instituicao', 'super_admin']), 
  zValidator('json', CriarExperienciaPayloadSchema), 
  async (c) => {
    const body = c.req.valid('json');
    const { id } = c.get('user');

    try {
      const res = await strapiPost<Experiencia>('/experiencias', {
        ...body,
        instituicaoId: id,
        estado: 'draft',
        slug: body.titulo.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
      });
      return c.json(res.data, 201);
    } catch (_err) {
      return c.json({ error: 'Falha na persistência da experiência' }, 502);
    }
  }
);

// PUT /experiencias/:id
experienciaRoutes.put('/:id', 
  checkRole(['instituicao', 'super_admin']), 
  zValidator('json', CriarExperienciaPayloadSchema.partial()), 
  async (c) => {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const { id: userId, role } = c.get('user');

    try {
      const resGet = await strapiGet<StrapiExperiencia>(`/experiencias/${id}`);
      const existing = resGet.data[0];

      if (!existing) return c.json({ error: 'Experiência não identificada' }, 404);

      if (existing.instituicaoId !== userId && role !== 'super_admin') {
        return c.json({ error: 'Autoridade insuficiente' }, 403);
      }

      const resPut = await strapiPut<Experiencia>(`/experiencias/${id}`, body);
      return c.json(resPut.data);
    } catch (_err) {
      return c.json({ error: 'Falha na atualização da experiência' }, 502);
    }
  }
);

// PATCH /experiencias/:id/estado
experienciaRoutes.patch('/:id/estado', checkRole(['instituicao', 'moderador', 'super_admin']), async (c) => {
  const id = c.req.param('id');
  const { estado } = await c.req.json();
  const { id: userId, role } = c.get('user');

  try {
    const resGet = await strapiGet<StrapiExperiencia>(`/experiencias/${id}`);
    const existing = resGet.data[0];

    if (!existing) return c.json({ error: 'Experiência não identificada' }, 404);

    if (existing.instituicaoId !== userId && role !== 'super_admin' && role !== 'moderador') {
      return c.json({ error: 'Autoridade insuficiente' }, 403);
    }

    await strapiPut(`/experiencias/${id}`, { estado });

    if (estado === 'published') {
      await eventBus.publishWithOutbox(DomainEventName.EXPERIENCIA_PUBLICADA, {
        experienciaId: id,
        autorId: existing.instituicaoId,
        titulo: existing.titulo
      });
    }

    return c.json({ success: true });
  } catch (_err) {
    return c.json({ error: 'Falha na transição de estado' }, 502);
  }
});
