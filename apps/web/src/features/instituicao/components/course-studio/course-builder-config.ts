import {
  CriarCursoPayloadSchema,
  CursoNivelSchema,
  type Curso,
  type CursoReadinessStep,
} from '@pdc/shared';
import type { z } from 'zod';
import { normalizeCourseItems } from './course-curriculum';

export type CourseFormValues = z.infer<typeof CriarCursoPayloadSchema>;
type EditableCursoState = NonNullable<CourseFormValues['estado']>;
type CursoVisibilidade = NonNullable<CourseFormValues['visibilidade']>;

export const COURSE_BUILDER_STEPS = [
  { id: 'info', label: 'Básico', description: 'Identidade do curso' },
  { id: 'curriculum', label: 'Currículo', description: 'Módulos e conteúdos' },
  { id: 'merit', label: 'Acesso', description: 'Público e requisitos' },
  { id: 'review', label: 'Revisão', description: 'Verificar e submeter' },
] as const;

export const COURSE_READINESS_STEPS: readonly CursoReadinessStep[] = [
  'info',
  'curriculum',
  'merit',
];

export const COURSE_FORM_DEFAULTS: CourseFormValues = {
  titulo: '',
  descricao: '',
  area: 'TECNOLOGIA',
  nivel: 'medio',
  visibilidade: 'publico',
  gratuito: true,
  preco: 0,
  moeda: 'AOA',
  comissao: 0,
  requerValidacaoComite: false,
  regrasAcesso: { minFluidez: 0, minResiliencia: 0, minFoco: 0 },
  modulos: [
    {
      titulo: 'Módulo 1: Introdução',
      ordem: 1,
      itens: [{ titulo: 'Bem-vindo', tipo: 'texto', ordem: 1 }],
    },
  ],
};

export function courseEditorialStatusLabel(isEditing: boolean, state: string | undefined): string {
  if (!isEditing) return 'Ainda não guardado';
  if (state === 'review') return 'Em revisão';
  if (state === 'published') return 'Publicado';
  return 'Rascunho';
}

export function courseFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    titulo: 'título',
    descricao: 'descrição',
    area: 'área vocacional',
    nivel: 'nível',
    capaUrl: 'capa',
    thumbnailUrl: 'capa',
    modulos: 'currículo',
    visibilidade: 'visibilidade',
    gratuito: 'modalidade de acesso',
    preco: 'preço',
    moeda: 'moeda',
    regrasAcesso: 'requisitos recomendados',
  };
  return labels[field] ?? 'uma etapa do curso';
}

export function firstCourseFormErrorMessage(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  if ('message' in value && typeof value.message === 'string') return value.message;
  for (const nested of Object.values(value)) {
    const message = firstCourseFormErrorMessage(nested);
    if (message) return message;
  }
  return undefined;
}

function toEditableState(state: string | undefined): EditableCursoState | undefined {
  return state === 'draft' || state === 'review' || state === 'published' ? state : undefined;
}

function resolveCursoVisibilidade(curso: Curso): CursoVisibilidade {
  const value = curso.visibilidade;
  return value === 'publico' || value === 'privado' || value === 'institucional'
    ? value
    : 'publico';
}

export function courseToFormValues(curso: Curso): CourseFormValues {
  const parsedLevel = CursoNivelSchema.safeParse(curso.nivel);
  return {
    titulo: curso.titulo,
    descricao: curso.descricao,
    area: curso.area ?? 'TECNOLOGIA',
    nivel: parsedLevel.success ? parsedLevel.data : 'medio',
    capaUrl: curso.capaUrl ?? undefined,
    visibilidade: resolveCursoVisibilidade(curso),
    gratuito: curso.gratuito ?? true,
    preco: curso.preco ?? 0,
    moeda: curso.moeda ?? 'AOA',
    comissao: 0,
    requerValidacaoComite: false,
    estado: toEditableState(curso.estado),
    regrasAcesso: {
      minFluidez: curso.regrasAcesso?.minFluidez ?? 0,
      minResiliencia: curso.regrasAcesso?.minResiliencia ?? 0,
      minFoco: curso.regrasAcesso?.minFoco ?? 0,
    },
    modulos: curso.modulos?.length
      ? curso.modulos.map((modulo, moduloIndex) => ({
          persistedId: modulo.id,
          titulo: modulo.titulo,
          ordem: modulo.ordem || moduloIndex + 1,
          itens: normalizeCourseItems(
            modulo.itens.map((item, itemIndex) => ({
              persistedId: item.id,
              titulo: item.titulo,
              tipo: item.tipo,
              conteudo: item.conteudo ?? undefined,
              url: item.url ?? undefined,
              videoId: item.videoId ?? undefined,
              imagens: item.imagens ?? undefined,
              ordem: item.ordem || itemIndex + 1,
            }))
          ),
        }))
      : COURSE_FORM_DEFAULTS.modulos.map((modulo) => ({
          ...modulo,
          itens: modulo.itens.map((item) => ({ ...item })),
        })),
  };
}
