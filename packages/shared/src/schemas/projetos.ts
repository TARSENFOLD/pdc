import { z } from 'zod';
import { AreaVocacionalSchema } from './enums.js';

export const ProjetoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  area: AreaVocacionalSchema,
  alunoId: z.string(),
  capaUrl: z.string().url().optional(),
  imagemUrl: z.string().url().optional(), // Alias para capaUrl usado em alguns componentes
  repoUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  links: z.array(z.string().url()).optional(),
  estado: z.enum(['draft', 'aprovado', 'publicado']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Projeto = z.infer<typeof ProjetoSchema>;

export const CriarProjetoPayloadSchema = ProjetoSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  alunoId: true,
});

export type CriarProjetoPayload = z.infer<typeof CriarProjetoPayloadSchema>;

export const ProjetoFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(12),
  alunoId: z.string().optional(),
  cursoId: z.string().optional(),
  tags: z.string().optional(),
});

export type ProjetoFilters = z.infer<typeof ProjetoFiltersSchema>;
