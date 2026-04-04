import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { UpdatePerfilPayloadSchema } from '@pdc/shared';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiPutRaw } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };

export const perfilRoutes = new Hono<Vars>();

perfilRoutes.use('*', verifyJwt);

// GET /perfis/me
perfilRoutes.get('/me', async (c) => {
  const user = c.get('user');
  const id = user.id;
  try {
    const data = await strapiGet<unknown>(`/users/${id}`, {
      populate: 'role,avatar',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// PUT /perfis/me
perfilRoutes.put('/me', zValidator('json', UpdatePerfilPayloadSchema), async (c) => {
  const user = c.get('user');
  const id = user.id;
  const body = c.req.valid('json');
  try {
    const data = await strapiPutRaw<unknown>(`/users/${id}`, body);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /perfis/:id — perfil público
perfilRoutes.get('/:id', async (c) => {
  const userId = c.req.param('id');
  try {
    const data = await strapiGet<unknown>(`/users/${userId}`, {
      populate: 'role,avatar',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});
