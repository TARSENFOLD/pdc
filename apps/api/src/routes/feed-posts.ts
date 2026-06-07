import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  CriarPostPayloadSchema,
  FeedPostSchema,
  ModerarPostSchema,
  type FeedPost,
} from '@pdc/shared';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { requireApproved } from '../middleware/requireApproved.js';
import { rateLimitContentCreate } from '../middleware/rateLimit.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { assessPostModerationRisk, type ModerationProfile, type ModerationRiskResult } from '../modules/moderation/moderation-risk.engine.js';
import pino from 'pino';

type Vars = { Variables: AuthVariables };

export const feedPostRoutes = new Hono<Vars>();
const log = pino({ name: 'feed-post-routes' });

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

interface StrapiPerfil {
  id: string | number;
  documentId?: string;
  userId: string;
  nome?: string;
  foto?: { url?: string } | null;
  avatarUrl?: string | null;
  createdAt?: string;
  reputacao?: number | null;
}

interface StrapiFeedPost {
  id: string | number;
  documentId?: string;
  autor?: StrapiPerfil | null | undefined;
  corpo: string;
  mediaUrls?: string[] | null;
  estado: FeedPost['estado'];
  motivoModeracao?: string | null;
  motivoRejeicao?: string | null;
  motivoOcultacao?: string | null;
  eventId?: string | null;
  likesCount?: number;
  comentariosCount?: number;
  sharesCount?: number;
  createdAt: string;
  updatedAt: string;
}

async function hasDuplicateRecentPost(perfil: ModerationProfile, corpo: string): Promise<boolean> {
  const recent = await strapiGet<StrapiFeedPost>('/feed-posts', {
    'filters[autor][id][$eq]': String(perfil.id),
    'filters[corpo][$eq]': corpo,
    'pagination[pageSize]': '1',
  });
  return recent.data.length > 0;
}

function postStateFromRisk(risk: ModerationRiskResult): FeedPost['estado'] {
  if (risk.decision === 'auto_hide') return 'hidden';
  if (risk.decision === 'needs_review') return 'pendente_moderacao';
  return 'aprovada';
}

function compactPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function firstFeedPost(posts: StrapiFeedPost[]): StrapiFeedPost | null {
  return posts[0] ?? null;
}

async function getPerfilByUserId(userId: string): Promise<StrapiPerfil | null> {
  const res = await strapiGet<StrapiPerfil>('/perfis', {
    'filters[userId][$eq]': userId,
    'populate': 'foto',
    'pagination[pageSize]': '1',
  });
  return res.data[0] ?? null;
}

function postTitle(corpo: string): string {
  const normalized = corpo.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 80) return normalized;
  return `${normalized.slice(0, 77)}...`;
}

async function publishPostEvent(post: StrapiFeedPost, autorUserId: string, eventId?: string): Promise<void> {
  await eventBus.publishWithOutbox(
    DomainEventName.POST_PUBLICADO,
    {
      postId: String(post.id),
      autorId: autorUserId,
      titulo: postTitle(post.corpo),
    },
    eventId,
  );
}

function mapFeedPost(post: StrapiFeedPost): FeedPost {
  const mapped: FeedPost = {
    id: String(post.id),
    corpo: post.corpo,
    mediaUrls: post.mediaUrls ?? [],
    estado: post.estado,
    likesCount: post.likesCount ?? 0,
    comentariosCount: post.comentariosCount ?? 0,
    sharesCount: post.sharesCount ?? 0,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    autorId: post.autor?.id !== undefined ? String(post.autor.id) : 'unknown',
    autor: post.autor
      ? {
          id: String(post.autor.id),
          nome: post.autor.nome ?? 'Autor PDC',
          avatarUrl: post.autor.foto?.url ?? post.autor.avatarUrl ?? undefined,
      }
      : undefined,
  };

  if (post.motivoRejeicao) mapped.motivoRejeicao = post.motivoRejeicao;
  if (post.motivoOcultacao) mapped.motivoOcultacao = post.motivoOcultacao;
  if (post.motivoModeracao) mapped.motivoModeracao = post.motivoModeracao;
  if (post.eventId) mapped.eventId = post.eventId;

  return FeedPostSchema.parse(mapped);
}

feedPostRoutes.get('/', zValidator('query', listQuerySchema), async (c) => {
  const { page, pageSize } = c.req.valid('query');

  try {
    const res = await strapiGet<StrapiFeedPost>('/feed-posts', {
      'filters[estado][$eq]': 'aprovada',
      'populate': 'autor.foto',
      'sort': 'createdAt:desc',
      'pagination[page]': String(page),
      'pagination[pageSize]': String(pageSize),
    });

    return c.json({
      data: res.data.map(mapFeedPost),
      meta: {
        total: res.meta.pagination.total,
        page,
        pageSize,
        hasMore: page < res.meta.pagination.pageCount,
      },
    });
  } catch (err: unknown) {
    log.error({ err }, 'Erro ao carregar posts do feed');
    return c.json({ error: 'Erro ao carregar posts do feed' }, 502);
  }
});

feedPostRoutes.get('/perfil/:perfilId', async (c) => {
  const perfilId = c.req.param('perfilId');
  try {
    const res = await strapiGet<StrapiFeedPost>('/feed-posts', {
      'filters[autor][id][$eq]': perfilId,
      'filters[estado][$eq]': 'aprovada',
      'populate': 'autor.foto',
      'sort': 'createdAt:desc',
      'pagination[pageSize]': '10',
    });
    return c.json({ data: res.data.map(mapFeedPost) });
  } catch (err: unknown) {
    log.error({ err, perfilId }, 'Erro ao carregar mini feed do perfil');
    return c.json({ error: 'Erro ao carregar mini feed do perfil' }, 502);
  }
});

feedPostRoutes.get('/:id', verifyJwt, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Id do post é obrigatório' }, 400);
  }

  try {
    const res = await strapiGet<StrapiFeedPost>('/feed-posts', {
      'filters[id][$eq]': id,
      'populate': 'autor.foto',
      'pagination[pageSize]': '1',
    });
    const post = firstFeedPost(res.data);

    if (!post) {
      return c.json({ error: 'Post não encontrado' }, 404);
    }

    return c.json(mapFeedPost(post));
  } catch (err: unknown) {
    log.error({ err, postId: id }, 'Erro ao carregar o post');
    return c.json({ error: 'Erro ao carregar o post' }, 502);
  }
});

feedPostRoutes.post(
  '/',
  verifyJwt,
  checkRole(['estudante', 'mentor', 'instituicao', 'moderador', 'comite_cientifico', 'super_admin']),
  requireApproved(),
  rateLimitContentCreate,
  zValidator('json', CriarPostPayloadSchema),
  async (c) => {
    const user = c.get('user');
    const payload = c.req.valid('json');
    const perfil = await getPerfilByUserId(user.id);

    if (!perfil) {
      return c.json({ error: 'Perfil do autor não encontrado' }, 404);
    }

    const eventId = crypto.randomUUID();

    try {
      const moderation = await assessPostModerationRisk(
        { corpo: payload.corpo, profile: perfil },
        { hasDuplicateRecentPost },
      );
      const estado = postStateFromRisk(moderation);
      const motivo = moderation.reasons.length > 0 ? moderation.reasons.join(',') : undefined;
      const created = await strapiPost<StrapiFeedPost>('/feed-posts', compactPayload({
        autor: perfil.documentId ?? perfil.id,
        corpo: payload.corpo,
        mediaUrls: payload.mediaUrls ?? [],
        estado,
        motivoRejeicao: estado === 'rejeitada' ? motivo : undefined,
        motivoOcultacao: estado === 'hidden' ? motivo : undefined,
        eventId,
        likesCount: 0,
        comentariosCount: 0,
      }));

      if (moderation.decision === 'needs_review' || moderation.decision === 'auto_hide') {
        await eventBus.publishWithOutbox(
          DomainEventName.POST_SUBMETIDO,
          {
            postId: String(created.data.id),
            autorId: user.id,
            titulo: postTitle(payload.corpo),
            moderacaoRequerida: moderation.decision === 'needs_review',
          },
          eventId,
        );
      } else {
        await publishPostEvent(created.data, user.id, eventId);
      }

      return c.json(mapFeedPost({ ...created.data, autor: perfil }), 201);
    } catch (err: unknown) {
      log.error({ err, userId: user.id }, 'Erro ao criar post do feed');
      return c.json({ error: 'Erro ao criar post do feed' }, 502);
    }
  },
);

feedPostRoutes.patch(
  '/:id/moderar',
  verifyJwt,
  checkRole(['moderador', 'super_admin']),
  zValidator('json', ModerarPostSchema),
  async (c) => {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Id do post é obrigatório' }, 400);
    }
    const payload = c.req.valid('json');

    try {
      const lookup = await strapiGet<StrapiFeedPost>('/feed-posts', {
        'filters[id][$eq]': id,
        'populate': 'autor.foto',
        'pagination[pageSize]': '1',
      });
      const post = firstFeedPost(lookup.data);

      if (!post) {
        return c.json({ error: 'Post não encontrado' }, 404);
      }

      const motivoLegado = payload.motivoModeracao;
      const updatePayload = compactPayload({
        estado: payload.estado,
        motivoRejeicao: payload.motivoRejeicao ?? (payload.estado === 'rejeitada' ? motivoLegado : undefined),
        motivoOcultacao: payload.motivoOcultacao ?? (payload.estado === 'hidden' ? motivoLegado : undefined),
      });
      const updated = await strapiPut<StrapiFeedPost>(
        `/feed-posts/${post.documentId ?? String(post.id)}`,
        updatePayload,
      );

      if (payload.estado === 'aprovada' && post.estado !== 'aprovada') {
        const autorId = post.autor?.userId;
        if (!autorId) return c.json({ error: 'Autor do post não encontrado' }, 502);

        const publicationEventId = crypto.randomUUID();
        await publishPostEvent(
          { ...updated.data, autor: post.autor },
          autorId,
          publicationEventId,
        );
      }

      return c.json(mapFeedPost({ ...updated.data, autor: post.autor }));
    } catch (err: unknown) {
      log.error({ err, postId: id }, 'Erro ao moderar post do feed');
      return c.json({ error: 'Erro ao moderar post do feed' }, 502);
    }
  },
);

feedPostRoutes.put(
  '/:id',
  verifyJwt,
  checkRole(['estudante', 'mentor', 'instituicao', 'moderador', 'comite_cientifico', 'super_admin']),
  zValidator('json', CriarPostPayloadSchema),
  async (c) => {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Id do post é obrigatório' }, 400);
    }
    const user = c.get('user');
    const payload = c.req.valid('json');

    try {
      const lookup = await strapiGet<StrapiFeedPost>('/feed-posts', {
        'filters[id][$eq]': id,
        'populate': 'autor.foto',
        'pagination[pageSize]': '1',
      });
      const post = firstFeedPost(lookup.data);

      if (!post) {
        return c.json({ error: 'Post não encontrado' }, 404);
      }

      if (post.autor?.userId !== user.id && user.role !== 'super_admin' && user.role !== 'moderador') {
        return c.json({ error: 'Não tem permissões para editar este post' }, 403);
      }

      const updated = await strapiPut<StrapiFeedPost>(
        `/feed-posts/${post.documentId ?? String(post.id)}`,
        { corpo: payload.corpo, mediaUrls: payload.mediaUrls ?? [] },
      );

      return c.json(mapFeedPost({ ...updated.data, autor: post.autor }));
    } catch (err: unknown) {
      log.error({ err, postId: id }, 'Erro ao editar post do feed');
      return c.json({ error: 'Erro ao editar post do feed' }, 502);
    }
  },
);

feedPostRoutes.post(
  '/:id/share',
  verifyJwt,
  async (c) => {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Id do post é obrigatório' }, 400);
    }

    try {
      const lookup = await strapiGet<StrapiFeedPost>('/feed-posts', {
        'filters[id][$eq]': id,
        'pagination[pageSize]': '1',
      });
      const post = firstFeedPost(lookup.data);

      if (!post) {
        return c.json({ error: 'Post não encontrado' }, 404);
      }

      const currentShares = post.sharesCount ?? 0;
      await strapiPut<StrapiFeedPost>(
        `/feed-posts/${post.documentId ?? String(post.id)}`,
        { sharesCount: currentShares + 1 },
      );

      return c.json({ success: true, sharesCount: currentShares + 1 });
    } catch (err: unknown) {
      log.error({ err, postId: id }, 'Erro ao partilhar post do feed');
      return c.json({ error: 'Erro ao partilhar post do feed' }, 502);
    }
  },
);
