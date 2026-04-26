import { z } from 'zod';
import { AreaVocacionalSchema, EstadoEditorialSchema } from './schemas/enums.js';

export const ItemModuloSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  tipo: z.enum(['video', 'pdf', 'texto', 'quiz', 'tarefa', 'iframe']),
  conteudo: z.string().optional(),
  ordem: z.number(),
  duracaoMinutos: z.number().optional(),
});

export type ItemModulo = z.infer<typeof ItemModuloSchema>;

export const ModuloSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string().optional(),
  ordem: z.number(),
  itens: z.array(ItemModuloSchema),
});

export type Modulo = z.infer<typeof ModuloSchema>;

export const CursoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  area: AreaVocacionalSchema.optional(),
  nivel: z.string().optional(),
  idioma: z.string().optional(),
  gratuito: z.boolean().optional(),
  preco: z.number().optional(),
  moeda: z.string().optional(),
  capaUrl: z.string().url().optional(),
  autorId: z.string(),
  totalHoras: z.number(),
  estado: EstadoEditorialSchema.optional().default('draft'),
  rating: z.number().min(0).max(5).optional().default(0),
  // Regras de Match Soberano
  regrasAcesso: z.object({
    minFluidez: z.number().min(0).max(10).optional(),
    minResiliencia: z.number().min(0).max(10).optional(),
    minFoco: z.number().min(0).max(10).optional(),
    areasCompativeis: z.array(AreaVocacionalSchema).optional(),
  }).optional(),
  modulos: z.array(ModuloSchema).optional(),
  
  // Detalhes de Mérito (Diferencial PDC)
  bloqueado: z.boolean().optional(),
  motivoBloqueio: z.string().optional(),
  
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Curso = z.infer<typeof CursoSchema>;

export const CriarCursoPayloadSchema = z.object({
  titulo: z.string().min(3).max(120),
  descricao: z.string().min(10).max(2000),
  area: AreaVocacionalSchema,
  nivel: z.enum(['basico', 'medio', 'avancado']),
  thumbnailUrl: z.string().url().optional(),
  capaUrl: z.string().url().optional(),
  preco: z.number().min(0).optional(),
  visibilidade: z.enum(['publico', 'privado', 'institucional']).optional().default('publico'),
  
  // Regras de Match Soberano (Mandatário para E2E)
  regrasAcesso: z.object({
    minFluidez: z.number().min(0).max(10).optional().default(0),
    minResiliencia: z.number().min(0).max(10).optional().default(0),
    minFoco: z.number().min(0).max(10).optional().default(0),
  }),

  // Estrutura em Cascata (Mandatário para E2E)
  modulos: z.array(z.object({
    titulo: z.string().min(3),
    ordem: z.number(),
    itens: z.array(z.object({
      titulo: z.string().min(3),
      tipo: z.enum(['video', 'pdf', 'texto', 'quiz', 'tarefa', 'iframe']),
      conteudo: z.string().optional(),
      ordem: z.number(),
    })).min(1),
  })).min(1),
});

export type CriarCursoPayload = z.infer<typeof CriarCursoPayloadSchema>;

export const CursoMeuSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional(),
  area: AreaVocacionalSchema.optional(),
  nivel: z.string().optional(),
  idioma: z.string().optional(),
  gratuito: z.boolean().optional(),
  totalHoras: z.number(),
  autorNome: z.string().optional(),
  estado: EstadoEditorialSchema,
  autorId: z.string(),
  inscritosCount: z.number().optional(),
});

export type CursoMeu = z.infer<typeof CursoMeuSchema>;

export const InscricaoSchema = z.object({
  id: z.string(),
  cursoId: z.string(),
  estudanteId: z.string(),
  dataInscricao: z.string().datetime(),
  concluido: z.boolean(),
  dataConclusao: z.string().datetime().optional(),
  progressoPercentagem: z.number().min(0).max(100),
});

export type Inscricao = z.infer<typeof InscricaoSchema>;

export const InscricaoComCursoSchema = InscricaoSchema.extend({
  curso: CursoSchema.optional(),
});

export type InscricaoComCurso = z.infer<typeof InscricaoComCursoSchema>;

export const CursoPublicoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional().nullable(),
  area: AreaVocacionalSchema.optional().nullable(),
  nivel: z.string().optional().nullable(),
  idioma: z.string().optional(),
  gratuito: z.boolean().optional(),
  totalHoras: z.number().optional(),
  autorNome: z.string().optional(),
});
export type CursoPublico = z.infer<typeof CursoPublicoSchema>;

export const CursoItemSchema = CursoPublicoSchema.extend({
  instituicaoNome: z.string().optional(),
  instituicao: z.object({ nome: z.string() }).optional(),
  inscritosCount: z.number().optional(),
}).passthrough();

export type CursoItem = z.infer<typeof CursoItemSchema>;

export interface CursoFilters {
  search?: string;
  area?: string;
  nivel?: string;
  categoria?: string;
  autorId?: string;
  page?: number;
  pageSize?: number;
}

export const ProgressoItemSchema = z.object({
  itemId: z.string(),
  concluido: z.boolean(),
  dataConclusao: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ProgressoItem = z.infer<typeof ProgressoItemSchema>;
