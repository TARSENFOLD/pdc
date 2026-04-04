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

export const commentsRoutes = new Hono<{ Variables: AuthVariables }>();

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

interface StrapiComment extends StrapiEntity {
  conteudo: string;
  estado: 'pendente'|'aprovado'|'rejeitado';
}

commentsRoutes.post('/', verifyJwt, zValidator('json', CreateCommentPayloadSchema), async (c) => {
  const user = c.get('user');
  const { targetType, targetId, conteudo } = c.req.valid('json');

  const res = await strapiPost<{ data: StrapiComment }>('/comments', {
    userId: user.id,
    targetType,
    targetId,
    conteudo,
    estado: 'pendente',
    createdAt: new Date().toISOString(),
  });

  const bodyResponse: Comment = {
    id: res.data.id.toString(),
    userId: res.data.userId,
    targetType: res.data.targetType,
    targetId: res.data.targetId,
    conteudo: res.data.conteudo,
    estado: res.data.estado,
    createdAt: res.data.createdAt,
  };

  return c.json({ data: bodyResponse }, 201);
});

commentsRoutes.get('/list', zValidator('query', z.object({
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
})), async (c) => {
  const { targetType, targetId } = c.req.valid('query');

  const req = await strapiGet<StrapiList<StrapiComment>>('/comments', {
    'filters[targetType][$eq]': targetType,
    'filters[targetId][$eq]': targetId,
    'filters[estado][$eq]': 'aprovado',
    'sort[0]': 'createdAt:desc',
  });

  const data: Comment[] = req.data.map(d => ({
    id: d.id.toString(),
    userId: d.userId,
    targetType: d.targetType,
    targetId: d.targetId,
    conteudo: d.conteudo,
    estado: d.estado,
    createdAt: d.createdAt,
  }));

  return c.json({ data });
});
