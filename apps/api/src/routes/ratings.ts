import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';

type Vars = { Variables: AuthVariables };
export const ratingRoutes = new Hono<Vars>();

ratingRoutes.use('*', verifyJwt);

interface StrapiRating {
  id: string;
  userId: string;
  valor: number;
}

// POST /ratings
ratingRoutes.post('/', zValidator('json', z.object({
  targetType: z.enum(['curso', 'simulacao', 'mentor']),
  targetId: z.string(),
  valor: z.number().min(1).max(5),
})), async (c) => {
  const { id: userId } = c.get('user');
  const { targetType, targetId, valor } = c.req.valid('json');

  try {
    const res = await strapiGet<StrapiRating>('/ratings', {
      'filters[userId][$eq]': userId,
      'filters[targetType][$eq]': targetType,
      'filters[targetId][$eq]': targetId,
    });

    if (res.data.length > 0) {
      const idToUpdate = res.data[0]?.id;
      await strapiPut(`/ratings/${String(idToUpdate)}`, { valor });
      return c.json({ success: true, action: 'updated' });
    }

    const resPost = await strapiPost<{ id: string | number }>('/ratings', {
      userId,
      targetType,
      targetId,
      valor,
      createdAt: new Date().toISOString(),
    });

    // G15: Impacto no Ecossistema
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    const perfilId = resPerfil.data[0]?.id;

    if (resPost.data) {
      await eventBus.publishWithOutbox(DomainEventName.RATING_CRIADO, {
        ratingId: String(resPost.data.id),
        perfilId: String(perfilId),
        targetType,
        targetId,
        valor
      });
    }

    return c.json({ success: true, action: 'created' }, 201);
  } catch (_err) {
    return c.json({ error: 'Erro ao processar avaliação' }, 502);
  }
});

// GET /ratings/stats
ratingRoutes.get('/stats', zValidator('query', z.object({
  targetType: z.enum(['curso', 'simulacao', 'mentor']),
  targetId: z.string(),
})), async (c) => {
  const { targetType, targetId } = c.req.valid('query');
  const userId = c.get('user')?.id;

  try {
    const res = await strapiGet<StrapiRating>('/ratings', {
      'filters[targetType][$eq]': targetType,
      'filters[targetId][$eq]': targetId,
      'pagination[limit]': '1000',
    });

    const ratings = res.data;
    let soma = 0;
    let userRating = 0;

    ratings.forEach(r => {
      soma += r.valor;
      if (userId && r.userId === userId) {
        userRating = r.valor;
      }
    });

    return c.json({
      media: ratings.length > 0 ? Number((soma / ratings.length).toFixed(1)) : 0,
      total: ratings.length,
      userRating: userRating || null,
    });
  } catch (_err) {
    return c.json({ error: 'Erro ao carregar estatísticas de avaliação' }, 502);
  }
});
