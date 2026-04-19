import { z } from 'zod';
import { AreaVocacionalSchema } from './schemas/enums.js';

export const FeedItemTipoSchema = z.enum([
  'post',
  'conquista',
  'vocacional',
  'trending',
  'curso',
  'simulacao',
  'experiencia',
  'projeto'
]);

export type FeedItemTipo = z.infer<typeof FeedItemTipoSchema>;

export const FeedItemSchema = z.object({
  id: z.string(),
  tipo: FeedItemTipoSchema,
  titulo: z.string(),
  corpo: z.string().optional(),
  descricao: z.string().optional(), // Map from Strapi descricao
  userId: z.string(),
  avatar: z.string().nullable().optional(),
  imagem: z.string().nullable().optional(),
  capaUrl: z.string().optional(),
  createdAt: z.string(),
  timestamp: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  slug: z.string().optional(),
  area: AreaVocacionalSchema.optional(),
  autorNome: z.string().optional(),
  score: z.number().optional(),
  recencyScore: z.number().optional(),
  stats: z.object({
    likes: z.number(),
    ratingMedia: z.number(),
    ratingTotal: z.number(),
    completionRate: z.number().optional(),
  }).optional(),
});

export type FeedItem = z.infer<typeof FeedItemSchema>;

export const FeedResponseSchema = z.object({
  data: z.array(FeedItemSchema),
  meta: z.object({
    total: z.number(),
    hasMore: z.boolean().optional(),
  }),
});

export type FeedResponse = z.infer<typeof FeedResponseSchema>;
