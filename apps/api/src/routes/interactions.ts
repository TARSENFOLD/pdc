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
import { rateLimitInteractions } from '../middleware/rateLimit.js';

export const interactionRoutes = new Hono<{ Variables: AuthVariables }>();

interactionRoutes.use('*', verifyJwt);

interface StrapiEntity {
  id: number;
  userId: string;
  targetType: InteractionTargetType;
  targetId: string;
  createdAt: string;
}

// ─── LIKES ────────────────────────────────────────────────────────────────────

interactionRoutes.post('/like', rateLimitInteractions, zValidator('json', ToggleLikePayloadSchema), async (c) => {
  const user = c.get('user');
  const { targetType, targetId } = c.req.valid('json');

  const p: Record<string, string> = {
    'filters[userId][$eq]': user.id,
    'filters[targetType][$eq]': targetType,
    'filters[targetId][$eq]': targetId,
  };

  // Fix: Generic type already represents the item.
  const res = await strapiGet<StrapiEntity>('/likes', p);

  if (res.data.length > 0) {
    // Apaga se já existe
    const idToDelete = res.data[0]?.id;
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

  const countReq = await strapiGet<unknown>('/likes', {
    'filters[targetType][$eq]': targetType,
    'filters[targetId][$eq]': targetId,
    'pagination[withCount]': 'true',
    'pagination[limit]': '1',
  });

  const exactUserReq = await strapiGet<StrapiEntity>('/likes', {
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

interactionRoutes.post('/bookmark', rateLimitInteractions, zValidator('json', ToggleBookmarkPayloadSchema), async (c) => {
  const user = c.get('user');
  const { targetType, targetId } = c.req.valid('json');

  const p: Record<string, string> = {
    'filters[userId][$eq]': user.id,
    'filters[targetType][$eq]': targetType,
    'filters[targetId][$eq]': targetId,
  };

  const res = await strapiGet<StrapiEntity>('/bookmarks', p);

  if (res.data.length > 0) {
    const idToDelete = res.data[0]?.id;
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

  const req = await strapiGet<StrapiEntity>('/bookmarks', {
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
