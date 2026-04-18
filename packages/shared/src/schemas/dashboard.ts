import { z } from 'zod';

export const AlunoStatsSchema = z.object({
  simulacoesConcluidas: z.number(),
  cursosEmProgresso: z.number(),
  conquistasTotal: z.number(),
});

export type AlunoStats = z.infer<typeof AlunoStatsSchema>;

export const MentorStatsSchema = z.object({
  mentoriasActivas: z.number(),
  alunosOrientados: z.number(),
  avaliacoesPendentes: z.number(),
});

export type MentorStats = z.infer<typeof MentorStatsSchema>;

export const InstituicaoStatsSchema = z.object({
  experienciasPublicadas: z.number(),
  inscricoesTotais: z.number(),
  programasActivos: z.number(),
  taxaPresenca: z.number().optional(),
  avaliacaoMedia: z.number().optional(),
  estudantesVinculados: z.number().optional(),
});

export type InstituicaoStats = z.infer<typeof InstituicaoStatsSchema>;

export const ConquistaSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  icone: z.string().optional(),
  raridade: z.enum(['comum', 'raro', 'epico', 'lendario']),
  alcancadaEm: z.string(),
  desbloqueada: z.boolean().optional(),
  dataDesbloqueio: z.string().optional(),
});

export type Conquista = z.infer<typeof ConquistaSchema>;

export const TelemetriaSummarySchema = z.object({
  totalEventos: z.number(),
  porTipo: z.record(z.number()),
  ultimoEvento: z.string().nullable(),
});

export type TelemetriaSummary = z.infer<typeof TelemetriaSummarySchema>;
