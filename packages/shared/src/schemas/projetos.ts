import { z } from 'zod';
import { AreaVocacionalSchema } from './enums.js';

export const ProjetoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  area: AreaVocacionalSchema.optional(),
  estudanteId: z.string().optional(),
  capaUrl: z.string().url().optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  repoUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  estado: z.enum(['draft', 'review', 'approved', 'published', 'archived']),
  visibilidade: z.enum(['publico', 'privado']).optional(),
  buscandoParceiros: z.boolean().optional(),
  autor: z.object({
    id: z.string(),
    nome: z.string(),
    foto: z.object({
      url: z.string().url(),
    }).optional().nullable(),
  }).optional().nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Projeto = z.infer<typeof ProjetoSchema>;

export const CriarProjetoPayloadSchema = ProjetoSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  estudanteId: true,
});

export type CriarProjetoPayload = z.infer<typeof CriarProjetoPayloadSchema>;

export const ProjetoFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(12),
  estudanteId: z.string().optional(),
  cursoId: z.string().optional(),
  tags: z.string().optional(),
});

export type ProjetoFilters = z.infer<typeof ProjetoFiltersSchema>;
