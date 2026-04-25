import { z } from 'zod';
import { AreaVocacionalSchema, ModalidadeSchema } from './enums.js';

export const ProgramaTipoSchema = z.enum(['standard', 'shadowapro', 'eduvisit']);
export const CriadorTipoSchema = z.enum(['mentor', 'instituicao']);

export const CronogramaEtapaSchema = z.object({
  titulo: z.string(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  responsavel: z.string().optional(),
});

export const CronogramaSchema = z.object({
  etapas: z.array(CronogramaEtapaSchema).default([]),
});

export type CronogramaEtapa = z.infer<typeof CronogramaEtapaSchema>;
export type Cronograma = z.infer<typeof CronogramaSchema>;

export const ProgramaSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string().optional(),
  proposito: z.string().optional(),
  metodologia: z.string().optional(),
  cronograma: CronogramaSchema.optional().nullable(),
  regrasMatricula: z.record(z.unknown()).optional().nullable(),
  precoPolicy: z.record(z.unknown()).optional().nullable(),
  criadorTipo: CriadorTipoSchema.optional().nullable(),
  area: AreaVocacionalSchema,
  tipo: ProgramaTipoSchema,
  instituicaoId: z.string().optional(),
  instituicao: z.object({
    id: z.string(),
    nome: z.string(),
    logoUrl: z.string().url().optional(),
  }).optional(),
  capa: z.object({
    url: z.string().url(),
  }).optional().nullable(),
  duracao: z.string().optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  modalidade: ModalidadeSchema.optional(),
  vagas: z.number().int().min(0).optional(),
  requisitos: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  estado: z.enum(['draft', 'published', 'archived']),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Programa = z.infer<typeof ProgramaSchema>;

export const CriarProgramaPayloadSchema = z.object({
  titulo: z.string().min(3, 'Título demasiado curto').max(120),
  descricao: z.string().optional(),
  proposito: z.string().min(10, 'Descreve o propósito do programa (mín. 10 caracteres)'),
  metodologia: z.string().optional(),
  cronograma: CronogramaSchema.optional(),
  regrasMatricula: z.record(z.unknown()).optional(),
  precoPolicy: z.record(z.unknown()).optional(),
  criadorTipo: CriadorTipoSchema.optional(),
  area: AreaVocacionalSchema,
  tipo: ProgramaTipoSchema,
  modalidade: ModalidadeSchema.optional(),
  vagas: z.number().int().min(0).optional(),
  requisitos: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  estado: z.enum(['draft', 'published', 'archived']).optional(),
  instituicaoId: z.string().optional(),
  // Campos auxiliares movidos para metadata pelo BFF
  profissionalShadow: z.string().optional(),
  areaShadowing: z.string().optional(),
  visitaUrl: z.string().optional(),
  localizacaoFisica: z.string().optional(),
});

export type CriarProgramaPayload = z.infer<typeof CriarProgramaPayloadSchema>;
