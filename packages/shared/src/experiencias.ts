import { z } from 'zod';
import { EstadoEditorialSchema } from './schemas/enums.js';
import { AreaVocacionalSchema, ModalidadeSchema, type Modalidade } from './schemas/enums.js';

export { ModalidadeSchema, type Modalidade };

export const ExperienciaSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional(),
  instituicaoId: z.string().optional(),
  instituicao: z.object({
    id: z.string(),
    nome: z.string(),
    logoUrl: z.string().url().optional(),
  }).optional(),
  gradeDestaque: z.array(z.object({
    disciplina: z.string(),
    descricao: z.string(),
    relevanciaMercado: z.string(),
  })).optional(),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

export type Experiencia = z.infer<typeof ExperienciaSchema>;

export const ExperienciaPublicaSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional().nullable(),
  instituicaoId: z.string().optional(),
  instituicaoNome: z.string().optional(),
  instituicao: z.object({
    id: z.string(),
    nome: z.string(),
    logoUrl: z.string().url().optional(),
  }).optional(),
  gradeDestaque: z.array(z.object({
    disciplina: z.string(),
    descricao: z.string(),
    relevanciaMercado: z.string(),
  })).optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional().nullable(),
  area: AreaVocacionalSchema.optional().nullable(),
  nivel: z.string().optional().nullable(),
  vagas: z.number().int().optional().nullable(),
  modalidade: ModalidadeSchema.optional().nullable(),
});
export type ExperienciaPublica = z.infer<typeof ExperienciaPublicaSchema>;

export const CriarExperienciaPayloadSchema = z.object({
  titulo: z.string().min(3).max(200),
  descricao: z.string().min(10),
  area: AreaVocacionalSchema,
  nivel: z.enum(['basico', 'medio', 'avancado']),
  vagas: z.number().int().min(1).optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  localizacao: z.string().max(200).optional(),
  modalidade: ModalidadeSchema,
  // 3 Painéis Obrigatórios (Spec 04)
  painelRealidade: z.object({
    salarioMedio: z.string().optional(),
    taxaEmpregabilidade: z.string().optional(),
    principaisEmpregadores: z.array(z.string()).optional(),
  }).optional(),
  muralVozes: z.array(z.object({
    autor: z.string(),
    cargo: z.string(),
    depoimento: z.string(),
    videoUrl: z.string().url().optional(),
  })).optional(),
  guiaInstitucional: z.object({
    fotosCampus: z.array(z.string().url()).optional(),
    timelineCurricular: z.array(z.object({ ano: z.string(), foco: z.string() })).optional(),
  }).optional(),
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
