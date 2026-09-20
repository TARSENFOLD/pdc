import { z } from 'zod';
import { AreaVocacionalSchema, EstadoEditorialSchema } from './schemas/enums.js';
import { inspectCourseModulePlacement } from './cursos-placement.js';
import { CursoItemImagemSchema } from './cursos-media.js';
import { CursoNivelSchema } from './cursos-level.js';

export * from './cursos-readiness.js';
export {
  CURSO_ITEM_IMAGEM_ALT_MAX_LENGTH,
  CURSO_ITEM_IMAGEM_ALT_MIN_LENGTH,
  CursoItemImagemSchema,
  CursoItemImagensSchema,
} from './cursos-media.js';
export type { CursoItemImagem } from './cursos-media.js';

export const CURSO_DESCRICAO_MAX_LENGTH = 2_000;

const OptionalUrlSchema = z.union([z.literal(''), z.string().url(), z.undefined()]);

const OptionalNullableUrlSchema = z.union([
  z.literal(''),
  z.string().url(),
  z.null(),
  z.undefined(),
]);

export const ItemModuloSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  tipo: z.enum(['video', 'pdf', 'texto', 'quiz', 'tarefa', 'iframe']),
  conteudo: z.string().optional(),
  url: OptionalNullableUrlSchema,
  videoId: z.string().optional(),
  imagens: z.array(CursoItemImagemSchema).optional().nullable(),
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
  capaUrl: OptionalUrlSchema,
  visibilidade: z.enum(['publico', 'privado', 'institucional']).optional(),
  autorId: z.string(),
  totalHoras: z.number(),
  estado: EstadoEditorialSchema.optional().default('draft'),
  rating: z.number().min(0).max(5).optional().default(0),
  inscritosCount: z.number().int().min(0).optional().default(0),
  autorNome: z.string().optional(),
  // Regras de Match Soberano
  regrasAcesso: z
    .object({
      minFluidez: z.number().min(0).max(10).optional(),
      minResiliencia: z.number().min(0).max(10).optional(),
      minFoco: z.number().min(0).max(10).optional(),
      areasCompativeis: z.array(AreaVocacionalSchema).optional(),
    })
    .optional(),
  modulos: z.array(ModuloSchema).optional(),

  // Detalhes de Mérito (Diferencial PDC)
  bloqueado: z.boolean().optional(),
  motivoBloqueio: z.string().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Curso = z.infer<typeof CursoSchema>;

const CriarCursoItemPayloadSchema = z.object({
  persistedId: z.string().optional(),
  titulo: z.string().min(3),
  tipo: z.enum(['video', 'pdf', 'texto', 'quiz', 'tarefa', 'iframe']),
  conteudo: z.string().optional(),
  url: OptionalUrlSchema,
  videoId: z.string().optional(),
  imagens: z.array(CursoItemImagemSchema).optional(),
  ordem: z.number().int().nonnegative(),
});

const CriarCursoModuloPayloadSchema = z
  .object({
    persistedId: z.string().optional(),
    titulo: z.string().min(3),
    ordem: z.number().int().nonnegative(),
    itens: z.array(CriarCursoItemPayloadSchema),
  })
  .superRefine((modulo, context) => {
    const placement = inspectCourseModulePlacement(modulo.itens);
    placement.duplicateOrderIndexes.forEach((index) => {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['itens', index, 'ordem'],
        message: 'Cada aula deve ter uma posição única no módulo.',
      });
    });
    if (placement.videoIndexes.length > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['itens'],
        message: 'Cada módulo pode ter no máximo um vídeo.',
      });
    }
    if (placement.misplacedVideoIndex !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['itens', placement.misplacedVideoIndex],
        message: 'O vídeo deve ser o primeiro conteúdo do módulo.',
      });
    }
  });

export const CriarCursoPayloadBaseSchema = z.object({
  titulo: z
    .string()
    .min(3, 'Adiciona um título com pelo menos 3 caracteres.')
    .max(120, 'O título pode ter no máximo 120 caracteres.'),
  descricao: z
    .string()
    .min(10, 'Escreve uma descrição com pelo menos 10 caracteres.')
    .max(
      CURSO_DESCRICAO_MAX_LENGTH,
      `A descrição pode ter no máximo ${String(CURSO_DESCRICAO_MAX_LENGTH)} caracteres.`
    ),
  area: AreaVocacionalSchema,
  nivel: CursoNivelSchema,
  thumbnailUrl: OptionalUrlSchema,
  capaUrl: OptionalUrlSchema,
  visibilidade: z.enum(['publico', 'privado', 'institucional']).optional(),

  // Pricing (Passo 4 do Wizard)
  gratuito: z.boolean().optional(),
  preco: z.number().min(0).optional(),
  moeda: z.string().min(3).max(3).optional(),
  comissao: z.number().min(0).max(100).optional(),
  estado: z.enum(['draft', 'review', 'published']).optional(),

  // Comité Científico (opt-in)
  requerValidacaoComite: z.boolean().optional(),

  // Regras de Match Soberano (Mandatário para E2E)
  regrasAcesso: z.object({
    minFluidez: z.number().min(0).max(10).optional(),
    minResiliencia: z.number().min(0).max(10).optional(),
    minFoco: z.number().min(0).max(10).optional(),
  }),

  // Estrutura em Cascata (Mandatário para E2E)
  modulos: z.array(CriarCursoModuloPayloadSchema).min(1),
});

function validateUniqueModuleOrders(
  modulos: readonly { ordem: number }[] | undefined,
  context: z.RefinementCtx
): void {
  const seenOrders = new Set<number>();
  modulos?.forEach((modulo, index) => {
    if (seenOrders.has(modulo.ordem)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['modulos', index, 'ordem'],
        message: 'Cada módulo deve ter uma posição única no curso.',
      });
    }
    seenOrders.add(modulo.ordem);
  });
}

export const CriarCursoPayloadSchema = CriarCursoPayloadBaseSchema.superRefine((curso, context) => {
  validateUniqueModuleOrders(curso.modulos, context);
});

export const AtualizarCursoPayloadSchema = CriarCursoPayloadBaseSchema.omit({ estado: true })
  .partial()
  .strict()
  .superRefine((curso, context) => {
    validateUniqueModuleOrders(curso.modulos, context);
  });

export type CriarCursoPayload = z.infer<typeof CriarCursoPayloadSchema>;
export type AtualizarCursoPayload = z.infer<typeof AtualizarCursoPayloadSchema>;

export const CursoMeuSchema = z.object({
  id: z.string(),
  documentId: z.string().optional(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: OptionalUrlSchema,
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

const StrapiIdSchema = z.union([z.string(), z.number()]).transform(String);
const StrapiRelationIdSchema = z.union([
  StrapiIdSchema,
  z.object({ id: StrapiIdSchema }).transform((value) => value.id),
  z.object({ data: z.object({ id: StrapiIdSchema }) }).transform((value) => value.data.id),
]);

export const InscricaoSchema = z.object({
  id: StrapiIdSchema,
  cursoId: StrapiRelationIdSchema.optional(),
  estudanteId: StrapiRelationIdSchema.optional(),
  perfilId: StrapiRelationIdSchema.optional(),
  curso: z.unknown().optional(),
  perfil: z.unknown().optional(),
  dataInscricao: z.string(),
  concluido: z.boolean().optional().default(false),
  dataConclusao: z.string().datetime().optional(),
  concluidoEm: z.string().datetime().optional().nullable(),
  progressoPercentual: z.number().min(0).max(100).optional().default(0),
  progressoPercentagem: z.number().min(0).max(100).optional(),
  modulosConcluidos: z.unknown().optional(),
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
  capaUrl: OptionalNullableUrlSchema,
  area: AreaVocacionalSchema.optional().nullable(),
  nivel: z.string().optional().nullable(),
  idioma: z.string().optional(),
  gratuito: z.boolean().optional(),
  totalHoras: z.number().optional(),
  autorNome: z.string().optional(),
  inscritosCount: z.number().optional(),
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

export const TelemetriaCursoItemSchema = z.object({
  cursoId: z.string(),
  moduloId: z.string(),
  itemId: z.string(),
  estudanteId: z.string(),
  acao: z.enum(['visualizado', 'concluido']),
  timestamp: z.string().datetime(),
});

export type TelemetriaCursoItem = z.infer<typeof TelemetriaCursoItemSchema>;
