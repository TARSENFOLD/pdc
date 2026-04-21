import { z } from 'zod';
import { AreaVocacionalSchema, ModalidadeSchema } from './enums.js';

export const ProgramaTipoSchema = z.enum(['standard', 'shadowapro', 'eduvisit']);

export const ProgramaSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
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

export const CriarProgramaPayloadSchema = ProgramaSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  instituicaoId: true,
}).extend({
  instituicaoId: z.string().optional(),
  // Campos auxiliares que o frontend envia e o BFF move para metadata
  profissionalShadow: z.string().optional(),
  areaShadowing: z.string().optional(),
  visitaUrl: z.string().optional(),
  localizacaoFisica: z.string().optional(),
});

export type CriarProgramaPayload = z.infer<typeof CriarProgramaPayloadSchema>;
