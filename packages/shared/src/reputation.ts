import { z } from 'zod';

export const ReputacaoTierSchema = z.enum(['BRONZE', 'PRATA', 'OURO', 'DIAMANTE']);
export type ReputacaoTier = z.infer<typeof ReputacaoTierSchema>;

export const ReputacaoBreakdownSchema = z.object({
  score: z.number().min(0).max(100),
  tier: ReputacaoTierSchema,
  dimensions: z.object({
    ratingsMedia: z.number(),
    cursosPublicados: z.number().int(),
    simulacoes: z.number().int(),
    conquistas: z.number().int(),
    tempoPlataforma: z.number(),
    engagement: z.number().int(),
  }),
});

export type ReputacaoBreakdown = z.infer<typeof ReputacaoBreakdownSchema>;
