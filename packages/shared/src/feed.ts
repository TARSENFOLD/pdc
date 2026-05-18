import { z } from 'zod';
import { AreaVocacionalSchema } from './schemas/enums.js';

export const FeedSourceSchema = z.enum(['geral', 'vocacional', 'institucional', 'trending']);
export type FeedSource = z.infer<typeof FeedSourceSchema>;

export const FeedQuerySchema = z.object({
  source: FeedSourceSchema.optional().default('geral'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});
export type FeedQuery = z.infer<typeof FeedQuerySchema>;

export const FeedItemTipoSchema = z.enum([
  'post',
  'conquista',
  'vocacional',
  'trending',
  'curso',
  'simulacao',
  'experiencia',
  'programa',
  'projeto',
]);

export type FeedItemTipo = z.infer<typeof FeedItemTipoSchema>;

export const FeedItemSchema = z.object({
  id: z.string(),
  tipo: FeedItemTipoSchema,
  titulo: z.string(),
  corpo: z.string().optional(),
  descricao: z.string().optional(),
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
  source: FeedSourceSchema.optional(),
  instituicaoId: z.string().optional(),
  stats: z.object({
    likes: z.number(),
    comentarios: z.number().optional(),
    shares: z.number().optional(),
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
    page: z.number().optional(),
    pageSize: z.number().optional(),
  }),
});

export type FeedResponse = z.infer<typeof FeedResponseSchema>;

// ─── Scoring & Weights (G12-T5) ─────────────────────────────────────────────

export interface FeedWeights {
  engagement: number;
  completion: number;
  rating: number;
  recency: number;
  reputation: number;
  affinity: number;
  time: number;
}

export const UpdateFeedWeightsPayloadSchema = z.object({
  weights: z.object({
    engagement: z.number().min(0).max(1),
    completion: z.number().min(0).max(1),
    rating: z.number().min(0).max(1),
    recency: z.number().min(0).max(1),
    reputation: z.number().min(0).max(1),
    affinity: z.number().min(0).max(1),
    time: z.number().min(0).max(1),
  }),
});

export type UpdateFeedWeightsPayload = z.infer<typeof UpdateFeedWeightsPayloadSchema>;
