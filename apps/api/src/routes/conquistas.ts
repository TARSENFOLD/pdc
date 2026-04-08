import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { verificarConquistas } from '../modules/conquistas/conquistas.engine.js';

type Vars = { Variables: AuthVariables };

const verificarSchema = z.object({
  evento: z.string().min(1, 'evento é obrigatório'),
  referencia: z.string().optional(),
});

export const conquistaRoutes = new Hono<Vars>();

conquistaRoutes.use('*', verifyJwt);

// GET /conquistas/minhas
conquistaRoutes.get('/minhas', async (c) => {
  const { id } = c.get('user');
  try {
    return c.json(
      await strapiGet<unknown>('/conquistas', {
        'filters[userId][$eq]': id,
        populate: 'conquista',
        'sort': 'createdAt:desc',
      })
    );
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// POST /conquistas/verificar — executa engine local de conquistas
conquistaRoutes.post('/verificar', zValidator('json', verificarSchema), async (c) => {
  const { id: userId } = c.get('user');
  const { evento, referencia } = c.req.valid('json');
  try {
    const unlocked = await verificarConquistas(userId, evento, referencia);
    return c.json({ unlocked }, unlocked.length > 0 ? 201 : 200);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});
