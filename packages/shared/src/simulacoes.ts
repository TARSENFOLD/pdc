import { z } from 'zod';
import { EstadoEditorialSchema, AreaVocacionalSchema } from './schemas/enums.js';

// ─── Configuração do Lab (Spec 04 §3.2) ───────────────────────────────────────

export const TipoSimulacaoSchema = z.enum(['tipo1', 'tipo2', 'tipo3']);
export type TipoSimulacao = z.infer<typeof TipoSimulacaoSchema>;

export const CriteriosAvaliacaoSchema = z.object({
  pesos: z.object({
    fluidez: z.number().min(0).max(100),
    resiliencia: z.number().min(0).max(100),
    foco: z.number().min(0).max(100),
  }),
}).refine(
  (data) => Math.round((data.pesos.fluidez + data.pesos.resiliencia + data.pesos.foco) * 100) === 10000,
  { message: 'A soma dos pesos deve ser exatamente 100%' }
);

export const SimulacaoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional().nullable(),
  area: AreaVocacionalSchema,
  tipo: z.number().min(1).max(3), // Alias para tipoSimulacao (compatibilidade UI)
  tipoSimulacao: TipoSimulacaoSchema,
  autorId: z.string(),
  estado: EstadoEditorialSchema.optional().default('draft'),
  validadoAcademicamente: z.boolean().default(false),
  tentativasMaximas: z.number().int().optional(), // 0 = sem limite
  conteudoUrl: z.string().url().optional(),
  iframeUrl: z.string().url().optional(),
  executorConfig: z.record(z.unknown()).optional(),
  criteriosAvaliacao: CriteriosAvaliacaoSchema,
  materiaisLab: z.array(z.object({
    id: z.string(),
    label: z.string(),
    url: z.string().url(),
  })).optional(),
  rating: z.number().min(0).max(5).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Simulacao = z.infer<typeof SimulacaoSchema>;

export type SimulacaoPublica = Simulacao; // Alias Spec 04
export type SimulacaoMinha = Simulacao & {
  inscricoesCount?: number;
};

export interface SimulacaoFilters {
  area?: string;
  tipo?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ─── Tentativas (Spec 04 §3.2) ────────────────────────────────────────────────

export const IniciarTentativaPayloadSchema = z.object({
  simulacaoId: z.string(),
});

export const ConcluirTentativaPayloadSchema = z.object({
  tentativaId: z.string(),
  telemetria: z.array(z.record(z.unknown())).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type IniciarTentativaPayload = z.infer<typeof IniciarTentativaPayloadSchema>;
export type ConcluirTentativaPayload = z.infer<typeof ConcluirTentativaPayloadSchema>;

export const CriarSimulacaoPayloadSchema = z.object({
  titulo: z.string().min(3).max(120),
  descricao: z.string().min(10),
  area: AreaVocacionalSchema,
  tipo: z.number().min(1).max(3),
  tipoLab: z.enum(['sandbox', 'prova', 'desafio', 'experimento']),
  tentativasMaximas: z.number().int().min(0).default(0),
  criteriosAvaliacao: CriteriosAvaliacaoSchema,
  capaUrl: z.string().url().optional(),
  iframeUrl: z.string().url().optional(),
  materiaisLab: z.array(z.object({
    id: z.string(),
    label: z.string(),
    url: z.string().url(),
  })).optional(),
});

export type CriarSimulacaoPayload = z.infer<typeof CriarSimulacaoPayloadSchema>;
