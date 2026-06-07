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

export const ExperienciaSecaoTipoSchema = z.enum([
  'boas_vindas',
  'ano_fase',
  'depoimentos',
  'realidade',
  'infraestrutura',
  'curriculo',
  'carreira',
  'materiais',
  'faq',
  'proximos_passos',
  'personalizado',
]);

export const ExperienciaItemTipoSchema = z.enum([
  'video',
  'texto',
  'imagem',
  'galeria',
  'pdf',
  'link',
  'iframe',
  'depoimento',
  'faq',
  'cta',
  'estatistica',
  'audio',
]);

export const ExperienciaItemSchema = z.object({
  id: z.string(),
  tipo: ExperienciaItemTipoSchema,
  ordem: z.number().int().min(0),
  titulo: z.string().min(1).max(200),
  conteudo: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  arquivoUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
  cta: z.object({
    label: z.string().min(1),
    url: z.string().url(),
  }).optional(),
});

export const ExperienciaSecaoSchema = z.object({
  id: z.string(),
  titulo: z.string().min(1).max(200),
  tipo: ExperienciaSecaoTipoSchema,
  ordem: z.number().int().min(0),
  obrigatoria: z.boolean(),
  visibilidade: z.enum(['publico', 'autenticado']),
  descricao: z.string().optional(),
  itens: z.array(ExperienciaItemSchema),
});

export type ExperienciaSecao = z.infer<typeof ExperienciaSecaoSchema>;
export type ExperienciaItem = z.infer<typeof ExperienciaItemSchema>;

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
  duracaoEstimada: z.number().int().optional().nullable(), // horas — espelha curso.duracaoEstimada
  ratingAvg: z.number().min(0).max(5).optional().nullable(), // calculado em runtime pelo BFF
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
  secoes: z.array(ExperienciaSecaoSchema).optional(),
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
  duracaoEstimada: z.number().int().min(1).max(10000).optional(), // horas
  painelRealidade: PainelRealidadeSchema.optional(),
  muralVozes: z.array(MuralVozesItemSchema).optional(),
  guiaInstitucional: GuiaInstitucionalSchema.optional(),
  secoes: z.array(ExperienciaSecaoSchema),
});

export type CriarExperienciaPayload = z.infer<typeof CriarExperienciaPayloadSchema>;
