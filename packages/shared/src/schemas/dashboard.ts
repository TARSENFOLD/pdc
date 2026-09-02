import { z } from 'zod';
import { DenunciaSchema } from './moderacao.js';

export { DenunciaSchema, type Denuncia } from './moderacao.js';

export const DashboardEstudanteSchema = z.object({
  stats: z.object({
    xp: z.number(),
    reputacao: z.number(),
    conquistasCount: z.number(),
    vinkulosCount: z.number(),
    pulseVariacao: z.number().nullable(),
  }),
  match: z.object({
    area: z.string(),
    score: z.number(),
    insight: z.string(),
    directive: z.string(),
  }),
  behavior: z.object({
    domainId: z.string(),
    fluidez: z.number(),
    resiliencia: z.number(),
    foco: z.number(),
  }).nullable(),
  progressoCursos: z.array(
    z.object({
      id: z.string(),
      titulo: z.string(),
      progresso: z.number(),
    }),
  ),
  proximaAcao: z.object({
    label: z.string(),
    to: z.string(),
  }),
  insightsTina: z.array(z.string()),
});

export const EstudanteStatsSchema = z.object({
  simulacoesConcluidas: z.number(),
  cursosEmProgresso: z.number(),
  conquistasTotal: z.number(),
});

export type EstudanteStats = z.infer<typeof EstudanteStatsSchema>;

export const MentorStatsSchema = z.object({
  mentoriasActivas: z.number(),
  estudantesOrientados: z.number(),
  avaliacoesPendentes: z.number(),
});

export type MentorStats = z.infer<typeof MentorStatsSchema>;

export const InstituicaoStatsSchema = z.object({
  conteudosTotais: z.number().int().nonnegative().nullable(),
  inscricoesTotais: z.number().int().nonnegative().nullable(),
  participacoesTotais: z.number().int().nonnegative().nullable(),
});

export type InstituicaoStats = z.infer<typeof InstituicaoStatsSchema>;

export const TelemetriaSummarySchema = z.object({
  totalEventos: z.number(),
  porTipo: z.record(z.number()),
  ultimoEvento: z.string().nullable(),
});

export type TelemetriaSummary = z.infer<typeof TelemetriaSummarySchema>;

export const MentorDashboardPatternSchema = z.object({
  perfil: z.object({
    id: z.string(),
    nome: z.string(),
    avatarUrl: z.string().optional(),
  }),
  cognitiveFluidity: z.number(),
  resilienceIndex: z.number(),
  hesitationIndex: z.number(),
  technicalScore: z.number(),
  lastUpdatedAt: z.string(),
});

export const MentorDashboardSchema = z.object({
  stats: z.object({
    totalTalentos: z.number(),
    meritoMedio: z.number(),
    fluidezMedia: z.number(),
  }),
  patterns: z.array(MentorDashboardPatternSchema),
});

export type MentorDashboardPattern = z.infer<typeof MentorDashboardPatternSchema>;
export type MentorDashboard = z.infer<typeof MentorDashboardSchema>;

export const ModeradorDashboardSchema = z.object({
  stats: z.object({
    denunciasPendentes: z.number(),
    resolvidasHoje: z.number(),
    taxaResolucao: z.number(),
  }),
  denunciasCriticas: z.array(DenunciaSchema),
});

export type ModeradorDashboard = z.infer<typeof ModeradorDashboardSchema>;
