import { z } from 'zod';
import { AreaVocacionalSchema } from './enums.js';

export const ProjetoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  area: AreaVocacionalSchema.optional(),
  autorId: z.string(),
  alunoId: z.string(),
  cursoId: z.string().optional(),
  tags: z.array(z.string()),
  mediaUrls: z.array(z.string()).optional(),
  imagemUrl: z.string().url().optional(),
  repoUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
  repositorioUrl: z.string().url().optional(),
  buscandoParceiros: z.boolean().optional(),
  visibilidade: z.enum(['publico', 'privado']).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type Projeto = z.infer<typeof ProjetoSchema>;

export const CriarProjetoPayloadSchema = z.object({
  titulo: z.string().min(3).max(120),
  descricao: z.string().min(10).max(2000),
  cursoId: z.string().optional(),
  tags: z.array(z.string()).max(10).optional(),
  imagemUrl: z.string().url().optional(),
  repoUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
});

export type CriarProjetoPayload = z.infer<typeof CriarProjetoPayloadSchema>;
export type CreateProjetoPayload = CriarProjetoPayload; // Alias for backward compatibility if needed
