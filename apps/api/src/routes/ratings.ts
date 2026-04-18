import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { strapiGet, strapiPost, strapiPutRaw } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import {
  CreateRatingPayloadSchema,
  InteractionTargetTypeSchema,
  type RatingStats,
} from '@pdc/shared';
import { getCookie } from 'hono/cookie';
import { jwtVerify } from 'jose';
import { env } from '../lib/env.js';

export const ratingsRoutes = new Hono<{ Variables: AuthVariables }>();

interface StrapiEntity {
  id: number;
  attributes?: Record<string, unknown>;
  userId: string;
  targetType: z.infer<typeof InteractionTargetTypeSchema>;
  targetId: string;
  createdAt: string;
}

interface StrapiList<T> {
  data: T[];
}

interface StrapiRating extends StrapiEntity {
  valor: number;
}

// Helper para ler silenciosamente o id do user, caso exista.
// Útil para endpoints públicos saberem o 'userRating'
async function getOptionalUserId(c: Context): Promise<string | null> {
  try {
    const token = getCookie(c, 'access_token');
    if (!token) return null;
    const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.sub as string;
  } catch {
    return null;
  }
}

ratingsRoutes.post('/', verifyJwt, zValidator('json', CreateRatingPayloadSchema), async (c) => {
  const user = c.get('user');
  const { targetType, targetId, valor } = c.req.valid('json');

  const p: Record<string, string> = {
    'filters[userId][$eq]': user.id,
    'filters[targetType][$eq]': targetType,
    'filters[targetId][$eq]': targetId,
  };

  const existants = await strapiGet<StrapiList<StrapiRating>>('/ratings', p);

  if (existants.data.length > 0) {
    // Atualizar
    const idToUpdate = existants.data[0]?.id;
    if (idToUpdate) {
      await strapiPutRaw(`/ratings/${idToUpdate.toString()}`, {
        data: { valor }
      });
    }
    return c.json({ success: true, updated: true });
  } else {
    // Criar
    await strapiPost('/ratings', {
      userId: user.id,
      targetType,
      targetId,
      valor,
      createdAt: new Date().toISOString(),
    });
    return c.json({ success: true, created: true });
  }
});

ratingsRoutes.get('/stats', zValidator('query', z.object({
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
})), async (c) => {
  const { targetType, targetId } = c.req.valid('query');
  const userId = await getOptionalUserId(c);

  const req = await strapiGet<StrapiList<StrapiRating>>('/ratings', {
    'filters[targetType][$eq]': targetType,
    'filters[targetId][$eq]': targetId,
    // Strapi por defeito tem limite 25, seria ideal remover limite ou paginar,
    // mas com um limite estendido serve o propósito do exercício:
    'pagination[limit]': '1000',
  });

  const ratings = req.data;
  const total = ratings.length;
  let soma = 0;
  let userRating: number | null = null;

  for (const r of ratings) {
    soma += r.valor;
    if (userId && r.userId === userId) {
      userRating = r.valor;
    }
  }

  const media = total > 0 ? soma / total : 0;

  const response: RatingStats = { media, total, userRating };
  return c.json(response);
});
