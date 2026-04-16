import { z } from 'zod';
import { EstadoEditorialSchema } from './user.js';
import { AreaVocacionalSchema } from './schemas/enums.js';

export const ExperienciaSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional(),
  instituicaoId: z.string(),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

export type Experiencia = z.infer<typeof ExperienciaSchema>;

export const ModalidadeSchema = z.enum(['presencial', 'online', 'hibrido']);
export type Modalidade = z.infer<typeof ModalidadeSchema>;

export const CriarExperienciaPayloadSchema = z.object({
  titulo: z.string().min(3).max(200),
  descricao: z.string().min(10),
  area: AreaVocacionalSchema,
  vagas: z.number().int().min(1).optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  localizacao: z.string().max(200).optional(),
  modalidade: ModalidadeSchema,
});

export type CriarExperienciaPayload = z.infer<typeof CriarExperienciaPayloadSchema>;

export const ExperienciaMinhaSchema = ExperienciaSchema.extend({
  estado: EstadoEditorialSchema,
  area: AreaVocacionalSchema.optional(),
  vagas: z.number().optional(),
  modalidade: ModalidadeSchema.optional(),
  inscricoesCount: z.number().optional(),
});

export type ExperienciaMinha = z.infer<typeof ExperienciaMinhaSchema>;
