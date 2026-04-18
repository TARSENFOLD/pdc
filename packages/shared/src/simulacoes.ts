import { z } from 'zod';
import { EstadoEditorialSchema } from './user.js';
import { AreaVocacionalSchema } from './schemas/enums.js';

export const SimulacaoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  area: AreaVocacionalSchema,
  tipo: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  capaUrl: z.string().url().optional(),
  conteudoUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  iframeUrl: z.string().url().optional(),
});

export type Simulacao = z.infer<typeof SimulacaoSchema>;

export const CriarSimulacaoPayloadSchema = z.object({
  titulo: z.string().min(3).max(120),
  descricao: z.string().min(10).max(2000),
  area: AreaVocacionalSchema,
  tipo: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  capaUrl: z.string().url().optional(),
  iframeUrl: z.string().url().optional(),
});

export type CriarSimulacaoPayload = z.infer<typeof CriarSimulacaoPayloadSchema>;

export const SimulacaoMinhaSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional(),
  area: AreaVocacionalSchema.optional(),
  tipo: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  nivel: z.string().optional(),
  estado: EstadoEditorialSchema,
  autorId: z.string(),
});

export type SimulacaoMinha = z.infer<typeof SimulacaoMinhaSchema>;

export const TentativaSchema = z.object({
  id: z.string(),
  simulacaoId: z.string(),
  alunoId: z.string(),
  eventId: z.string(),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime().optional(),
  score: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type Tentativa = z.infer<typeof TentativaSchema>;

export const IniciarTentativaPayloadSchema = z.object({
  simulacaoId: z.string(),
});

export type IniciarTentativaPayload = z.infer<typeof IniciarTentativaPayloadSchema>;

export interface SimulacaoFilters {
  search?: string;
  area?: string;
  tipo?: 1 | 2 | 3;
  page?: number;
  pageSize?: number;
}

export const ConcluirTentativaPayloadSchema = z.object({
  tentativaId: z.string(),
  score: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ConcluirTentativaPayload = z.infer<typeof ConcluirTentativaPayloadSchema>;
