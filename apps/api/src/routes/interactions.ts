import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import pino from 'pino';
import {
  StrapiHttpError,
  strapiGet,
  strapiPost,
  strapiDelete,
} from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import {
  ToggleLikePayloadSchema,
  ToggleBookmarkPayloadSchema,
  SharePayloadSchema,
  InteractionTargetTypeSchema,
  type LikeStatus,
  type ShareStatus,
} from '@pdc/shared';
import { rateLimitInteractions } from '../middleware/rateLimit.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import {
  getInteractionPerfil,
  interactionPerfilId,
  interactionPerfilRelationField,
} from '../modules/interactions/interaction-profile.js';
import {
  toBookmark,
  type StrapiInteractionEntity,
  type StrapiShare,
} from './interactions.types.js';

export const interactionRoutes = new Hono<{ Variables: AuthVariables }>();
const log = pino({ name: 'routes:interactions' });

interactionRoutes.use('*', verifyJwt);

async function countInteractions(
  endpoint: '/likes' | '/partilhas',
  targetType: string,
  targetId: string,
  extraFilters?: Record<string, string>,
): Promise<number> {
  try {
    const countReq = await strapiGet<unknown>(endpoint, {
      'filters[targetType][$eq]': targetType,
      'filters[targetId][$eq]': targetId,
      ...(extraFilters ? extraFilters : {}),
      'pagination[withCount]': 'true',
      'pagination[pageSize]': '1',
    });
    return countReq.meta.pagination.total || 0;
  } catch (err: unknown) {
    log.error({ err, endpoint, targetType, targetId }, 'Falha ao obter contagem de interações');
    return 0;
  }
}

// ─── LIKES ────────────────────────────────────────────────────────────────────

interactionRoutes.post('/like', rateLimitInteractions, zValidator('json', ToggleLikePayloadSchema), async (c) => {
  const user = c.get('user');
  const { targetType, targetId } = c.req.valid('json');
  const perfil = await getInteractionPerfil(user.id);
  if (!perfil) return c.json({ error: 'Perfil não encontrado' }, 404);
  const actorField = interactionPerfilRelationField(perfil);

  const p: Record<string, string> = {
    [`filters[actor][${actorField}][$eq]`]: String(interactionPerfilId(perfil)),
    'filters[targetType][$eq]': targetType,
    'filters[targetId][$eq]': targetId,
  };

  // Fix: Generic type already represents the item.
  const res = await strapiGet<StrapiInteractionEntity>('/likes', p);

  if (res.data.length > 0) {
    // Apaga se já existe
    const existing = res.data[0];
    const idToDelete = existing?.documentId ?? existing?.id;
    if (idToDelete) await strapiDelete(`/likes/${String(idToDelete)}`);
    return c.json({ liked: false, count: await countInteractions('/likes', targetType, targetId) } satisfies LikeStatus);
  } else {
    // Cria novo
    await strapiPost('/likes', {
      actor: interactionPerfilId(perfil),
      targetType,
      targetId,
      criadoEm: new Date().toISOString(),
    });
    await eventBus.publishWithOutbox(DomainEventName.LIKE_ADICIONADO, {
      autorId: String(interactionPerfilId(perfil)),
      targetType,
      targetId,
    }).catch((err: unknown) => {
      log.error({ err, userId: user.id, targetType, targetId }, 'Like persistido; falha ao publicar evento no outbox');
    });
    return c.json({ liked: true, count: await countInteractions('/likes', targetType, targetId) } satisfies LikeStatus);
  }
});

interactionRoutes.get('/like/status', zValidator('query', z.object({
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
})), async (c) => {
  const user = c.get('user');
  const { targetType, targetId } = c.req.valid('query');
  const perfil = await getInteractionPerfil(user.id);
  if (!perfil) return c.json({ error: 'Perfil não encontrado' }, 404);
  const actorField = interactionPerfilRelationField(perfil);

  const exactUserReq = await strapiGet<StrapiInteractionEntity>('/likes', {
    [`filters[actor][${actorField}][$eq]`]: String(interactionPerfilId(perfil)),
    'filters[targetType][$eq]': targetType,
    'filters[targetId][$eq]': targetId,
  });

  const response: LikeStatus = {
    liked: exactUserReq.data.length > 0,
    count: await countInteractions('/likes', targetType, targetId),
  };

  return c.json(response);
});

// ─── BOOKMARKS ────────────────────────────────────────────────────────────────

interactionRoutes.post('/bookmark', rateLimitInteractions, zValidator('json', ToggleBookmarkPayloadSchema), async (c) => {
  const user = c.get('user');
  const { targetType, targetId } = c.req.valid('json');
  const perfil = await getInteractionPerfil(user.id);
  if (!perfil) return c.json({ error: 'Perfil não encontrado' }, 404);
  const actorField = interactionPerfilRelationField(perfil);

  const p: Record<string, string> = {
    [`filters[actor][${actorField}][$eq]`]: String(interactionPerfilId(perfil)),
    'filters[targetType][$eq]': targetType,
    'filters[targetId][$eq]': targetId,
  };

  const res = await strapiGet<StrapiInteractionEntity>('/bookmarks', p);

  if (res.data.length > 0) {
    const existing = res.data[0];
    const idToDelete = existing?.documentId ?? existing?.id;
    if (idToDelete) await strapiDelete(`/bookmarks/${String(idToDelete)}`);
    return c.json({ bookmarked: false });
  } else {
    await strapiPost('/bookmarks', {
      actor: interactionPerfilId(perfil),
      targetType,
      targetId,
      criadoEm: new Date().toISOString(),
    });
    await eventBus.publishWithOutbox(DomainEventName.BOOKMARK_ADICIONADO, {
      autorId: String(interactionPerfilId(perfil)),
      targetType,
      targetId,
    }).catch((err: unknown) => {
      log.error({ err, userId: user.id, targetType, targetId }, 'Bookmark persistido; falha ao publicar evento no outbox');
    });
    return c.json({ bookmarked: true });
  }
});

interactionRoutes.get('/bookmark/status', zValidator('query', z.object({
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
})), async (c) => {
  const user = c.get('user');
  const { targetType, targetId } = c.req.valid('query');
  const perfil = await getInteractionPerfil(user.id);
  if (!perfil) return c.json({ error: 'Perfil não encontrado' }, 404);
  const actorField = interactionPerfilRelationField(perfil);
  const existing = await strapiGet<StrapiInteractionEntity>('/bookmarks', {
    [`filters[actor][${actorField}][$eq]`]: String(interactionPerfilId(perfil)),
    'filters[targetType][$eq]': targetType,
    'filters[targetId][$eq]': targetId,
    'pagination[pageSize]': '1',
  });
  return c.json({ bookmarked: existing.data.length > 0 });
});

interactionRoutes.get('/bookmarks', async (c) => {
  const user = c.get('user');
  const perfil = await getInteractionPerfil(user.id);
  if (!perfil) return c.json({ error: 'Perfil não encontrado' }, 404);
  const actorField = interactionPerfilRelationField(perfil);

  const req = await strapiGet<StrapiInteractionEntity>('/bookmarks', {
    [`filters[actor][${actorField}][$eq]`]: String(interactionPerfilId(perfil)),
  });

  const data = req.data.map((entity) => toBookmark(entity, perfil));

  return c.json({ data });
});

// ─── SHARES ──────────────────────────────────────────────────────────────────

interactionRoutes.post('/share', rateLimitInteractions, zValidator('json', SharePayloadSchema), async (c) => {
  const user = c.get('user');
  const payload = c.req.valid('json');
  const perfil = await getInteractionPerfil(user.id);
  if (!perfil) return c.json({ error: 'Perfil não encontrado' }, 404);
  const actorField = interactionPerfilRelationField(perfil);

  const filters = {
    [`filters[actor][${actorField}][$eq]`]: String(interactionPerfilId(perfil)),
    'filters[targetType][$eq]': payload.targetType,
    'filters[targetId][$eq]': payload.targetId,
    'filters[canal][$eq]': payload.canal,
    'pagination[pageSize]': '1',
  };
  const existing = await strapiGet<StrapiShare>('/partilhas', filters);
  const current = existing.data[0];

  if (current) {
    const count = await countInteractions('/partilhas', payload.targetType, payload.targetId);
    return c.json({
      shared: payload.canal === 'interno',
      shareId: current.documentId ?? String(current.id),
      count,
    } satisfies ShareStatus);
  }

  let created;
  try {
    created = await strapiPost<StrapiShare>('/partilhas', {
      actor: interactionPerfilId(perfil),
      targetType: payload.targetType,
      targetId: payload.targetId,
      canal: payload.canal,
      nota: payload.nota,
      criadoEm: new Date().toISOString(),
    });
  } catch (error) {
    if (!(error instanceof StrapiHttpError) || error.status !== 409) throw error;
    const concurrent = await strapiGet<StrapiShare>('/partilhas', filters);
    const existingShare = concurrent.data[0];
    if (!existingShare) throw error;
    const all = await strapiGet<unknown>('/partilhas', {
      'filters[targetType][$eq]': payload.targetType,
      'filters[targetId][$eq]': payload.targetId,
      'pagination[pageSize]': '1',
    });
    return c.json({
      shared: payload.canal === 'interno',
      shareId: existingShare.documentId ?? String(existingShare.id),
      count: all.meta.pagination.total,
    } satisfies ShareStatus);
  }

  await eventBus.publishWithOutbox(DomainEventName.PARTILHA_CRIADA, {
    autorId: String(interactionPerfilId(perfil)),
    targetType: payload.targetType,
    targetId: payload.targetId,
  }).catch((err: unknown) => {
    log.error({
      err,
      userId: user.id,
      targetType: payload.targetType,
      targetId: payload.targetId,
      canal: payload.canal,
    }, 'Partilha persistida; falha ao publicar evento no outbox');
  });

  const count = await strapiGet<unknown>('/partilhas', {
    'filters[targetType][$eq]': payload.targetType,
    'filters[targetId][$eq]': payload.targetId,
    'pagination[pageSize]': '1',
  });
  return c.json({
    shared: payload.canal === 'interno',
    shareId: created.data.documentId ?? String(created.data.id),
    count: count.meta.pagination.total,
  } satisfies ShareStatus, 201);
});

interactionRoutes.get('/share/status', zValidator('query', z.object({
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
})), async (c) => {
  const user = c.get('user');
  const { targetType, targetId } = c.req.valid('query');
  const perfil = await getInteractionPerfil(user.id);
  if (!perfil) return c.json({ error: 'Perfil não encontrado' }, 404);
  const actorField = interactionPerfilRelationField(perfil);

  const [mine, all] = await Promise.all([
    strapiGet<StrapiShare>('/partilhas', {
      [`filters[actor][${actorField}][$eq]`]: String(interactionPerfilId(perfil)),
      'filters[targetType][$eq]': targetType,
      'filters[targetId][$eq]': targetId,
      'filters[canal][$eq]': 'interno',
      'pagination[pageSize]': '1',
    }),
    strapiGet<unknown>('/partilhas', {
      'filters[targetType][$eq]': targetType,
      'filters[targetId][$eq]': targetId,
      'pagination[pageSize]': '1',
    }),
  ]);
  const share = mine.data[0];
  return c.json({
    shared: Boolean(share),
    shareId: share ? (share.documentId ?? String(share.id)) : undefined,
    count: all.meta.pagination.total,
  } satisfies ShareStatus);
});

interactionRoutes.delete('/share/:id', async (c) => {
  const user = c.get('user');
  const shareId = c.req.param('id');
  const perfil = await getInteractionPerfil(user.id);
  if (!perfil) return c.json({ error: 'Perfil não encontrado' }, 404);
  const actorField = interactionPerfilRelationField(perfil);

  const existing = await strapiGet<StrapiShare>('/partilhas', {
    'filters[$and][0][$or][0][id][$eq]': shareId,
    'filters[$and][0][$or][1][documentId][$eq]': shareId,
    [`filters[$and][1][actor][${actorField}][$eq]`]: String(interactionPerfilId(perfil)),
    'pagination[pageSize]': '1',
  });
  const share = existing.data[0];
  if (!share) return c.json({ error: 'Republicação não encontrada' }, 404);
  if (share.canal !== 'interno') {
    return c.json({ error: 'Apenas republicações internas podem ser removidas' }, 400);
  }
  await strapiDelete(`/partilhas/${String(share.documentId ?? share.id)}`);
  return c.json({ shared: false });
});
