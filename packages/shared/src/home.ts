import { z } from 'zod';
import { FeedItemTipoSchema } from './feed.js';

export const InscricaoActivitySchema = z.object({
  inscricaoId: z.string(),
  cursoId: z.string(),
  cursoTitulo: z.string(),
  cursoCapaUrl: z.string().url().nullable(),
  progressoPercentual: z.number(),
  ultimaAtividadeEm: z.string().datetime(),
});

export type InscricaoActivity = z.infer<typeof InscricaoActivitySchema>;

export const TentativaActivitySchema = z.object({
  tentativaId: z.string(),
  simulacaoId: z.string(),
  simulacaoTitulo: z.string(),
  status: z.enum(['em_progresso', 'concluida', 'falhou']),
  score: z.number(),
  dataInicio: z.string().datetime(),
});

export type TentativaActivity = z.infer<typeof TentativaActivitySchema>;

export const OnboardingVideoSchema = z.object({
  embedType: z.enum(['r2', 'youtube', 'vimeo']),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().nullable(),
  duracaoSegundos: z.number().int().nonnegative(),
  tituloPt: z.string(),
  tituloEn: z.string(),
});

export type OnboardingVideo = z.infer<typeof OnboardingVideoSchema>;

export const TrendingItemSchema = z.object({
  id: z.string(),
  tipo: FeedItemTipoSchema,
  titulo: z.string(),
  score: z.number(),
  autorId: z.string(),
  capaUrl: z.string().url().nullable(),
});

export type TrendingItem = z.infer<typeof TrendingItemSchema>;

export const HomeSummarySchema = z.object({
  greeting: z.string(),
  personalizedMessage: z.string(),
  stats: z.object({
    xp: z.number().optional(),
    reputacao: z.number(),
    conquistasCount: z.number().optional(),
    vinkulosCount: z.number().optional(),
    activeStudents: z.number().optional(),
    activePrograms: z.number().optional(),
    pendingActions: z.number().default(0),
  }),
  nextDirective: z.object({
    label: z.string(),
    to: z.string(),
    type: z.enum(['learning', 'review', 'collaboration', 'setup', 'onboarding']),
    description: z.string(),
  }).nullable(),
  socialPulse: z.array(z.object({
    id: z.string(),
    type: z.string(),
    message: z.string(),
    timestamp: z.string(),
  })),
  quickActions: z.array(z.object({
    label: z.string(),
    to: z.string(),
    icon: z.string(),
    variant: z.enum(['primary', 'secondary', 'ghost']).default('secondary'),
  })),
  recentActivitiesCursos: z.array(InscricaoActivitySchema).max(2).default([]),
  recentActivitiesSimulacoes: z.array(TentativaActivitySchema).max(2).default([]),
  onboardingVideo: OnboardingVideoSchema.nullable().default(null),
  trendingComunidade: z.array(TrendingItemSchema).default([]),
  aprenderAgora: z.array(TrendingItemSchema).default([]),
});

export type HomeSummary = z.infer<typeof HomeSummarySchema>;
