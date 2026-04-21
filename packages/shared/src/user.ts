import { z } from 'zod';
import { ReputacaoTierSchema } from './reputation.js';
import { ConquistaSchema } from './schemas/dashboard.js';
import { InscricaoComCursoSchema } from './cursos.js';

export const RoleSchema = z.enum([
  'estudante',
  'estudante', // Legacy alias
  'mentor',
  'instituicao',
  'moderador',
  'comite_cientifico',
  'super_admin',
  'patrocinador',
]);

export type Role = z.infer<typeof RoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  nome: z.string(),
  role: RoleSchema,
  avatarUrl: z.string().url().optional().nullable(),
  reputacaoTier: ReputacaoTierSchema.optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  bio: z.string().optional().nullable(),
});

export type User = z.infer<typeof UserSchema>;

export const PerfilPublicoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  role: RoleSchema,
  avatarUrl: z.string().url().optional().nullable(),
  reputacaoTier: ReputacaoTierSchema.optional().nullable(),
  bio: z.string().optional().nullable(),
});

export type PerfilPublico = z.infer<typeof PerfilPublicoSchema>;

/** Legacy alias for PerfilPublico used in web app */
export type PerfilPublicoBasico = PerfilPublico;

export const MentorPublicoSchema = PerfilPublicoSchema.extend({
  especialidade: z.string(),
  areaEspecialidade: z.string().optional(),
  disponivel: z.boolean().optional(),
});
export type MentorPublico = z.infer<typeof MentorPublicoSchema>;

export const InstituicaoPublicaSchema = z.object({
  id: z.string(),
  nome: z.string(),
  logoUrl: z.string().url().optional().nullable(),
  tipo: z.string().optional().nullable(),
  regiao: z.string().optional().nullable(),
  areaAtuacao: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
});
export type InstituicaoPublica = z.infer<typeof InstituicaoPublicaSchema>;

// EstadoEditorial moved to enums.ts

// ─── Visibility & Notifications ───────────────────────────────────────────────

export const FieldVisibilitySchema = z.enum(['publico', 'conexoes', 'privado']);
export type FieldVisibility = z.infer<typeof FieldVisibilitySchema>;

export const VisibilitySettingsSchema = z.object({
  bio: FieldVisibilitySchema.optional(),
  telefone: FieldVisibilitySchema.optional(),
  socialLinks: FieldVisibilitySchema.optional(),
  areasInteresse: FieldVisibilitySchema.optional(),
  competencias: FieldVisibilitySchema.optional(),
});
export type VisibilitySettings = z.infer<typeof VisibilitySettingsSchema>;

export const NotificationPreferencesSchema = z.object({
  emailMensagens: z.boolean().optional(),
  emailConquistas: z.boolean().optional(),
  emailMentorias: z.boolean().optional(),
  emailNewsletter: z.boolean().optional(),
});
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

/**
 * PerfilCompletoSchema (Elite Sincronizado)
 * Inclui os campos reais do Strapi v5.
 */
export const PerfilCompletoSchema = UserSchema.extend({
  bio: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  website: z.string().url().optional().or(z.literal('')).nullable(),
  regiao: z.string().optional().nullable(),
  areasInteresse: z.array(z.string()).optional().default([]),
  areaInteresse: z.string().optional().nullable(),
  xp: z.number().int().default(0),
  reputacao: z.number().int().default(0),
  reputacaoTier: ReputacaoTierSchema.optional().nullable(),
  socialLinks: z.array(z.object({
    platform: z.string(),
    url: z.string().url()
  })).optional().default([]),
  instituicaoId: z.string().optional().nullable(),
  visibilitySettings: VisibilitySettingsSchema.optional().nullable(),
  notificationPreferences: NotificationPreferencesSchema.optional().nullable(),
  conquistas: z.array(ConquistaSchema).optional().default([]),
  inscricoes: z.array(InscricaoComCursoSchema).optional().default([]),
});

export type PerfilCompleto = z.infer<typeof PerfilCompletoSchema>;

// ─── Update Payload ───────────────────────────────────────────────────────────

export const UpdatePerfilPayloadSchema = z.object({
  nome: z.string().min(2).optional(),
  bio: z.string().max(500).optional(),
  telefone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  regiao: z.string().optional(),
  socialLinks: z.array(z.object({
    platform: z.string(),
    url: z.string().url()
  })).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  visibilitySettings: VisibilitySettingsSchema.optional(),
  notificationPreferences: NotificationPreferencesSchema.optional(),
});

export type UpdatePerfilPayload = z.infer<typeof UpdatePerfilPayloadSchema>;
