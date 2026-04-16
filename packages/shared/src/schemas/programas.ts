import { z } from 'zod';
import { AreaVocacionalSchema } from './enums.js';
import { EstadoEditorialSchema } from '../user.js';
import { ModalidadeSchema } from '../experiencias.js';

export const ProgramaSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  area: AreaVocacionalSchema,
  estado: EstadoEditorialSchema,
  modalidade: ModalidadeSchema,
  duracao: z.string().optional(),
  vagas: z.number().int().min(1).optional(),
  requisitos: z.string().optional(),
  tipo: z.enum(['standard', 'shadowapro', 'eduvisit']),
  instituicaoId: z.string(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type Programa = z.infer<typeof ProgramaSchema>;

export const CriarProgramaPayloadSchema = z.object({
  titulo: z.string().min(3).max(200),
  descricao: z.string().min(10),
  area: AreaVocacionalSchema,
  modalidade: ModalidadeSchema,
  vagas: z.number().int().min(1).optional(),
  requisitos: z.string().optional(),
  tipo: z.enum(['standard', 'shadowapro', 'eduvisit']),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  // Campos auxiliares que vão para metadata no Strapi
  profissionalShadow: z.string().optional(),
  areaShadowing: z.string().optional(),
  visitaUrl: z.string().optional(),
  localizacaoFisica: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type CriarProgramaPayload = z.infer<typeof CriarProgramaPayloadSchema>;
