import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { strapiGet, strapiPost } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import {
  CreateCommentPayloadSchema,
  InteractionTargetTypeSchema,
  type Comment,
  type InteractionTargetType,
} from '@pdc/shared';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { rateLimitComments } from '../middleware/rateLimit.js';
import pino from 'pino';
import {
  getInteractionPerfil,
  interactionPerfilDto,
  interactionPerfilId,
  type InteractionPerfil,
} from '../modules/interactions/interaction-profile.js';

export const commentsRoutes = new Hono<{ Variables: AuthVariables }>();
const log = pino({ name: 'comments-routes' });

interface StrapiEntity {
  id: number;
  autor?: InteractionPerfil;
  targetType: InteractionTargetType;
  targetId: string;
  criadoEm?: string;
  createdAt?: string;
}

interface StrapiComment extends StrapiEntity {
  conteudo: string;
  estado: 'ativo' | 'removido' | 'moderado';
  parentId?: string;
}

function mapComment(comment: StrapiComment): Comment {
  if (!comment.autor) {
    log.error({ comentarioId: comment.id }, 'Comentário retornado sem autor populado');
    throw new Error('Comentário sem autor');
  }
  const createdAt = comment.criadoEm ?? comment.createdAt;
  if (!createdAt) {
    log.error({ comentarioId: comment.id }, 'Comentário retornado sem timestamp');
    throw new Error('Comentário sem timestamp');
  }
  return {
    id: String(comment.id),
    targetType: comment.targetType,
    targetId: comment.targetId,
    conteudo: comment.conteudo,
    estado: comment.estado,
    parentId: comment.parentId,
    createdAt,
    autor: interactionPerfilDto(comment.autor),
  };
}

commentsRoutes.post('/', verifyJwt, rateLimitComments, zValidator('json', CreateCommentPayloadSchema), async (c) => {
  const user = c.get('user');
  const { targetType, targetId, conteudo, parentId } = c.req.valid('json');
  const perfil = await getInteractionPerfil(user.id);
  if (!perfil) return c.json({ error: 'Perfil não encontrado' }, 404);

  const res = await strapiPost<StrapiComment>('/comments', {
    autor: interactionPerfilId(perfil),
    targetType,
    targetId,
    conteudo,
    parentId,
    estado: 'ativo',
    criadoEm: new Date().toISOString(),
  });

  await eventBus.publishWithOutbox(DomainEventName.COMENTARIO_CRIADO, {
    autorId: String(interactionPerfilId(perfil)),
    targetType,
    targetId,
  }).catch((err: unknown) => {
    log.error(
      { err, userId: user.id, comentarioId: res.data.id, targetType, targetId },
      'Comentário persistido; falha ao publicar evento no outbox',
    );
  });

  return c.json({ data: mapComment({ ...res.data, autor: perfil }) }, 201);
});

commentsRoutes.get('/list', zValidator('query', z.object({
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
})), async (c) => {
  const { targetType, targetId } = c.req.valid('query');
  try {
    const req = await strapiGet<StrapiComment>('/comments', {
      'filters[targetType][$eq]': targetType,
      'filters[targetId][$eq]': targetId,
      'filters[estado][$eq]': 'ativo',
      'sort[0]': 'createdAt:desc',
      populate: 'autor.foto',
    });
    return c.json({ data: req.data.map(mapComment) });
  } catch (error) {
    log.error({ error, targetType, targetId }, 'Falha ao mapear comentários');
    return c.json({ error: 'Não foi possível carregar os comentários' }, 502);
  }
});
