import { z } from 'zod';

export const FeedPostEstadoSchema = z.enum(['pendente_moderacao', 'aprovada', 'rejeitada', 'hidden']);

export const FeedPostSchema = z.object({
  id: z.string(),
  autorId: z.string(),
  autor: z.object({
    id: z.string(),
    nome: z.string(),
    avatarUrl: z.string().url().optional(),
  }).optional(),
  corpo: z.string().min(1).max(10000),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  estado: FeedPostEstadoSchema,
  motivoModeracao: z.string().optional(),
  eventId: z.string().optional(),
  likesCount: z.number().int().min(0).default(0),
  comentariosCount: z.number().int().min(0).default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type FeedPost = z.infer<typeof FeedPostSchema>;

export const CriarPostPayloadSchema = z.object({
  corpo: z.string().min(1).max(10000),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
});

export type CriarPostPayload = z.infer<typeof CriarPostPayloadSchema>;

export const ModerarPostSchema = z.object({
  estado: z.enum(['aprovada', 'rejeitada', 'hidden']),
  motivoModeracao: z.string().optional(),
});

export type ModerarPostPayload = z.infer<typeof ModerarPostSchema>;
