import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { strapiGet, strapiPost, strapiDelete } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import {
  ToggleLikePayloadSchema,
  ToggleBookmarkPayloadSchema,
  InteractionTargetTypeSchema,
  type LikeStatus,
  type Bookmark,
  type InteractionTargetType,
} from '@pdc/shared';

export const interactionRoutes = new Hono<{ Variables: AuthVariables }>();

interactionRoutes.use('*', verifyJwt);

interface StrapiEntity {
  id: number;
  userId: string;
  targetType: InteractionTargetType;
  targetId: string;
  createdAt: string;
}

interface StrapiList<T> {
  data: T[];
}

// ─── LIKES ────────────────────────────────────────────────────────────────────

interactionRoutes.post('/like', zValidator('json', ToggleLikePayloadSchema), async (c) => {
  const user = c.get('user');
  const { targetType, targetId } = c.req.valid('json');

  const p: Record<string, string> = {
    'filters[userId][$eq]': user.id,
    'filters[targetType][$eq]': targetType,
    'filters[targetId][$eq]': targetId,
  };

  const existants = await strapiGet<StrapiList<StrapiEntity>>('/likes', p);

  if (existants.data.length > 0) {
    // Apaga se já existe
    const idToDelete = existants.data[0]?.id;
    if (idToDelete) await strapiDelete(`/likes/${idToDelete.toString()}`);
    return c.json({ liked: false });
  } else {
    // Cria novo
    await strapiPost('/likes', {
      userId: user.id,
      targetType,
      targetId,
      createdAt: new Date().toISOString(),
    });
    return c.json({ liked: true });
  }
});

interactionRoutes.get('/like/status', zValidator('query', z.object({
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
})), async (c) => {
  const user = c.get('user');
  const { targetType, targetId } = c.req.valid('query');

  const countReq = await strapiGet<{ meta: { pagination: { total: number } } }>('/likes', {
    'filters[targetType][$eq]': targetType,
    'filters[targetId][$eq]': targetId,
    'pagination[withCount]': 'true',
    'pagination[limit]': '1',
  });

  const exactUserReq = await strapiGet<StrapiList<StrapiEntity>>('/likes', {
    'filters[userId][$eq]': user.id,
    'filters[targetType][$eq]': targetType,
    'filters[targetId][$eq]': targetId,
  });

  const response: LikeStatus = {
    liked: exactUserReq.data.length > 0,
    count: countReq.meta.pagination.total || 0,
  };

  return c.json(response);
});

// ─── BOOKMARKS ────────────────────────────────────────────────────────────────

interactionRoutes.post('/bookmark', zValidator('json', ToggleBookmarkPayloadSchema), async (c) => {
  const user = c.get('user');
  const { targetType, targetId } = c.req.valid('json');

  const p: Record<string, string> = {
    'filters[userId][$eq]': user.id,
    'filters[targetType][$eq]': targetType,
    'filters[targetId][$eq]': targetId,
  };

  const existants = await strapiGet<StrapiList<StrapiEntity>>('/bookmarks', p);

  if (existants.data.length > 0) {
    const idToDelete = existants.data[0]?.id;
    if (idToDelete) await strapiDelete(`/bookmarks/${idToDelete.toString()}`);
    return c.json({ bookmarked: false });
  } else {
    await strapiPost('/bookmarks', {
      userId: user.id,
      targetType,
      targetId,
      createdAt: new Date().toISOString(),
    });
    return c.json({ bookmarked: true });
  }
});

interactionRoutes.get('/bookmarks', async (c) => {
  const user = c.get('user');

  const req = await strapiGet<StrapiList<StrapiEntity>>('/bookmarks', {
    'filters[userId][$eq]': user.id,
  });

  // Convert to DTO
  const data: Bookmark[] = req.data.map(d => ({
    id: d.id.toString(),
    userId: d.userId,
    targetType: d.targetType,
    targetId: d.targetId,
    createdAt: d.createdAt,
  }));

  return c.json({ data });
});
