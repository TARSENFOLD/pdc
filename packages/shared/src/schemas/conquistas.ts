import { z } from 'zod';

export const ConquistaOrigemSchema = z.enum(['auto', 'manual']);

export const ConquistaTipoSchema = z.enum(['automatica', 'manual', 'institucional', 'plataforma']);

export const ConquistaTipoAutorSchema = z.enum(['mentor', 'instituicao', 'plataforma', 'aluno']);

/**
 * Canonical Conquista schema — covers all 14 Strapi attributes (ADR-020).
 * Legacy UI-only fields (desbloqueada, dataDesbloqueio, raridade, icone, alcancadaEm)
 * are kept optional for backward compatibility with web app and user profile data.
 */
export const ConquistaSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string().optional().nullable(),
  // 14 Strapi attributes
  tipo: ConquistaTipoSchema.optional(),
  origem: ConquistaOrigemSchema.optional(),
  categoria: z.string().optional().nullable(),
  midias: z.array(z.object({
    url: z.string().optional(),
    mime: z.string().optional(),
    name: z.string().optional(),
  })).optional(),
  autor: z.unknown().optional(),
  perfis: z.array(z.unknown()).optional(),
  tipoAutor: ConquistaTipoAutorSchema.optional(),
  aprovada: z.boolean().optional(),
  tags: z.unknown().optional(),
  data: z.string().optional().nullable(),
  validadoAcademicamente: z.boolean().optional(),
  // Legacy UI fields — not in Strapi schema, kept for backward compat
  icone: z.string().optional(),
  raridade: z.enum(['comum', 'raro', 'epico', 'lendario']).optional(),
  alcancadaEm: z.string().optional(),
  desbloqueada: z.boolean().optional(),
  dataDesbloqueio: z.string().optional(),
});

export type Conquista = z.infer<typeof ConquistaSchema>;

export const CriarConquistaManualPayloadSchema = z.object({
  titulo: z.string().min(3).max(120),
  descricao: z.string().min(10).max(2000),
  categoria: z.string().optional(),
  mediaUrls: z.array(z.string().url()).max(5).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

export type CriarConquistaManualPayload = z.infer<typeof CriarConquistaManualPayloadSchema>;
