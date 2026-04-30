import { z } from 'zod';
import { EstadoEditorialSchema, AreaVocacionalSchema, ModalidadeSchema } from './schemas/enums.js';

// ─── 3 Painéis Canónicos (G3 Spec 04 §3.1) ─────────────────────────────────────────

export const PainelRealidadeSchema = z.object({
  taxaEmpregabilidade: z.string().optional(), // ex: "94%"
  salarioMedio: z.string().optional(),
  taxaConclusao: z.string().optional(),
  principaisEmpregadores: z.array(z.string()).optional(),
});

export const MuralVozesItemSchema = z.object({
  tipo: z.enum(['aluno', 'professor', 'profissional']),
  autor: z.string(),
  cargo: z.string().optional(),
  videoUrl: z.string().url().optional(),
  depoimento: z.string(),
});

export const GuiaInstitucionalSchema = z.object({
  fotosCampus: z.array(z.string().url()).optional(),
  biblioteca: z.string().optional(),
  laboratorios: z.string().optional(),
  corpoDocente: z.string().optional(),
  timelineCurricular: z.array(z.object({ ano: z.string(), foco: z.string() })).optional(),
});

export type PainelRealidade = z.infer<typeof PainelRealidadeSchema>;
export type MuralVozesItem = z.infer<typeof MuralVozesItemSchema>;
export type GuiaInstitucional = z.infer<typeof GuiaInstitucionalSchema>;

// ─── Schema Canónico da Experiência (SSOT G3-T1) ────────────────────────────

export const ExperienciaSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional().nullable(),
  gratuito: z.literal(true).default(true), // Inegociável Spec 04 §3.1
  area: AreaVocacionalSchema.optional().nullable(),
  nivel: z.enum(['basico', 'medio', 'avancado']).optional().nullable(),
  modalidade: ModalidadeSchema.optional().nullable(),
  estado: EstadoEditorialSchema.optional().default('draft'),
  validadoAcademicamente: z.boolean().default(false),
  vagas: z.number().int().optional().nullable(),
  dataInicio: z.string().optional().nullable(),
  dataFim: z.string().optional().nullable(),
  gradeDestaque: z.array(z.object({
    disciplina: z.string(),
    descricao: z.string(),
    relevanciaMercado: z.string(),
  })).optional(),
  instituicaoId: z.string().optional(),
  instituicao: z.object({
    id: z.string(),
    nome: z.string(),
    logoUrl: z.string().url().optional(),
  }).optional(),
  painelRealidade: PainelRealidadeSchema.optional(),
  muralVozes: z.array(MuralVozesItemSchema).optional(),
  guiaInstitucional: GuiaInstitucionalSchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Experiencia = z.infer<typeof ExperienciaSchema>;
export type ExperienciaPublica = Experiencia; // Alias Spec 04

export const ExperienciaMinhaSchema = ExperienciaSchema.extend({
  inscricoesCount: z.number().optional(),
});
export type ExperienciaMinha = z.infer<typeof ExperienciaMinhaSchema>;

// ─── Payload de Criação (G3-T2) ──────────────────────────────────────────────

export const CriarExperienciaPayloadSchema = z.object({
  titulo: z.string().min(3).max(200),
  descricao: z.string().min(10),
  area: AreaVocacionalSchema,
  nivel: z.enum(['basico', 'medio', 'avancado']),
  modalidade: ModalidadeSchema,
  painelRealidade: PainelRealidadeSchema.optional(),
  muralVozes: z.array(MuralVozesItemSchema).optional(),
  guiaInstitucional: GuiaInstitucionalSchema.optional(),
});

export type CriarExperienciaPayload = z.infer<typeof CriarExperienciaPayloadSchema>;
