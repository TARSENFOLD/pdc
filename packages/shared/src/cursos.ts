import { z } from 'zod';
import { EstadoEditorialSchema } from './user.js';
import { AreaVocacionalSchema } from './schemas/enums.js';

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
  capaUrl: z.string().url().optional(),
  autorId: z.string(),
  modulos: z.array(ModuloSchema).optional(),
  totalHoras: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Curso = z.infer<typeof CursoSchema>;

export const CriarCursoPayloadSchema = z.object({
  titulo: z.string().min(3).max(120),
  descricao: z.string().min(10).max(2000),
  area: AreaVocacionalSchema,
  nivel: z.string().min(2).max(100),
  capaUrl: z.string().url().optional(),
  preco: z.number().min(0).optional(),
  visibilidade: z.enum(['publico', 'privado']).optional(),
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
