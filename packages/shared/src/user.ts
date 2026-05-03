import { z } from 'zod';
import { ReputacaoTierSchema } from './reputation.js';
import { ConquistaSchema } from './schemas/conquistas.js';
import { InscricaoComCursoSchema } from './cursos.js';
import { RoleSchema, type Role } from './schemas/enums.js';

export { RoleSchema, type Role };

/** Normalise a role from persistent storage — maps legacy 'aluno' → 'estudante'. */
export function normalizeTipo(tipo: string): Role {
  const t = tipo.toLowerCase();
  if (t === 'aluno') return 'estudante';
  if (t === 'admin') return 'super_admin';

  const parsed = RoleSchema.safeParse(t);
  return parsed.success ? parsed.data : 'estudante';
}

// ─── Visibilidade (Spec 03 §6) ──────────────────────────────────────────────

export type FieldVisibility = 'public' | 'private' | 'vinkulated' | 'publico' | 'conexoes' | 'privado';

export interface VisibilitySettings {
  email: FieldVisibility;
  telefone: FieldVisibility;
  miniFeed: FieldVisibility;
  vinculos: FieldVisibility;
  bio: FieldVisibility;
  socialLinks: FieldVisibility;
  areasInteresse: FieldVisibility;
  competencias: FieldVisibility;
  historicoProfissional: FieldVisibility;
  formacaoAcademica: FieldVisibility;
}

export const VisibilitySettingsSchema = z.object({
  email: z.enum(['public', 'private', 'vinkulated', 'publico', 'conexoes', 'privado']).default('private'),
  telefone: z.enum(['public', 'private', 'vinkulated', 'publico', 'conexoes', 'privado']).default('private'),
  miniFeed: z.enum(['public', 'private', 'vinkulated', 'publico', 'conexoes', 'privado']).default('public'),
  vinculos: z.enum(['public', 'private', 'vinkulated', 'publico', 'conexoes', 'privado']).default('public'),
  bio: z.enum(['public', 'private', 'vinkulated', 'publico', 'conexoes', 'privado']).default('public'),
  socialLinks: z.enum(['public', 'private', 'vinkulated', 'publico', 'conexoes', 'privado']).default('vinkulated'),
  areasInteresse: z.enum(['public', 'private', 'vinkulated', 'publico', 'conexoes', 'privado']).default('public'),
  competencias: z.enum(['public', 'private', 'vinkulated', 'publico', 'conexoes', 'privado']).default('public'),
  historicoProfissional: z.enum(['public', 'private', 'vinkulated', 'publico', 'conexoes', 'privado']).default('vinkulated'),
  formacaoAcademica: z.enum(['public', 'private', 'vinkulated', 'publico', 'conexoes', 'privado']).default('vinkulated'),
});

export const NotificationPreferencesSchema = z.object({
  emailMensagens: z.boolean().optional(),
  emailConquistas: z.boolean().optional(),
  emailMentorias: z.boolean().optional(),
  emailNewsletter: z.boolean().optional(),
});

// ─── Histórico Profissional & Académico ─────────────────────────────────────

export const HistoricoProfissionalSchema = z.object({
  id: z.string().min(1),
  cargo: z.string().min(1),
  empresa: z.string().min(1),
  inicio: z.string().min(1),
  fim: z.string().min(1).optional(),
  atual: z.boolean().optional().default(false),
  descricao: z.string().optional(),
});

export const FormacaoAcademicaSchema = z.object({
  id: z.string().min(1),
  grau: z.string().min(1),
  instituicao: z.string().min(1),
  area: z.string().optional(),
  inicio: z.string().min(1),
  fim: z.string().min(1).optional(),
  atual: z.boolean().optional().default(false),
});

export type HistoricoProfissional = z.infer<typeof HistoricoProfissionalSchema>;
export type FormacaoAcademica = z.infer<typeof FormacaoAcademicaSchema>;

// ─── Utilizador & Perfis ───────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  nome: z.string(),
  role: RoleSchema,
  perfilId: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  reputacaoTier: ReputacaoTierSchema.optional().default('BRONZE'),
  xp: z.number().default(0),
  reputacao: z.number().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  bio: z.string().optional(),
  headline: z.string().optional(),
  regiao: z.string().optional(),
  areaInteresse: z.string().optional(),
  areasInteresse: z.array(z.string()).default([]),
  conquistas: z.array(ConquistaSchema).default([]),
});

export type User = z.infer<typeof UserSchema>;

// Payloads de Registo (Integritade Hotspot 3)
export const RegistoBaseSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nome: z.string().min(3),
  documentos: z.array(z.string()).optional(),
});

export const RegistoEstudantePayloadSchema = RegistoBaseSchema.extend({
  areaInteresse: z.string().optional(),
  nivelEnsino: z.string().optional(),
});

export const RegistoMentorPayloadSchema = RegistoBaseSchema.extend({
  areaEspecialidade: z.string(),
  areasAtuacao: z.array(z.string()).optional(),
  especialidade: z.string().optional(),
});

export const RegistoInstituicaoPayloadSchema = RegistoBaseSchema.extend({
  nomeInstituicao: z.string().optional(),
  regiao: z.string().optional(),
  tipo: z.string(),
});

export type RegistoEstudantePayload = z.infer<typeof RegistoEstudantePayloadSchema>;
export type RegistoMentorPayload = z.infer<typeof RegistoMentorPayloadSchema>;
export type RegistoInstituicaoPayload = z.infer<typeof RegistoInstituicaoPayloadSchema>;

export const UpdatePerfilPayloadSchema = z.object({
  nome: z.string().min(3).optional(),
  bio: z.string().max(1000).optional(),
  headline: z.string().optional(),
  regiao: z.string().optional(),
  telefone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  avatarUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  areasInteresse: z.array(z.string()).optional(),
  competencias: z.array(z.string()).optional(),
  socialLinks: z.array(z.object({ platform: z.string().min(1), url: z.string().url() })).optional(),
  historicoProfissional: z.array(HistoricoProfissionalSchema).optional(),
  formacaoAcademica: z.array(FormacaoAcademicaSchema).optional(),
  visibilitySettings: VisibilitySettingsSchema.optional(),
  notificationPreferences: NotificationPreferencesSchema.optional(),
});

export type UpdatePerfilPayload = z.infer<typeof UpdatePerfilPayloadSchema>;

export const MentorPublicoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  avatarUrl: z.string().url().optional().nullable(),
  areaEspecialidade: z.string(),
  especialidade: z.string().optional(),
  reputacaoTier: ReputacaoTierSchema,
  bio: z.string().optional(),
  disponivel: z.boolean().default(true),
});

export type MentorPublico = z.infer<typeof MentorPublicoSchema>;

export const InstituicaoPublicaSchema = z.object({
  id: z.string(),
  nome: z.string(),
  logoUrl: z.string().url().optional().nullable(),
  tipo: z.string(),
  regiao: z.string().optional(),
  bio: z.string().optional(),
  descricao: z.string().optional(),
  slug: z.string().optional(),
});

export type InstituicaoPublica = z.infer<typeof InstituicaoPublicaSchema>;

export const PerfilCompletoSchema = UserSchema.extend({
  biografia: z.string().optional(),
  localizacao: z.string().optional(),
  telefone: z.string().optional(),
  website: z.string().url().optional(),
  regiao: z.string().optional(),
  bannerUrl: z.string().url().optional().nullable(),
  socialLinks: z.array(z.object({ platform: z.string(), url: z.string() })).default([]),
  inscricoes: z.array(InscricaoComCursoSchema).optional(),
  visibilitySettings: VisibilitySettingsSchema.optional(),
  notificationPreferences: NotificationPreferencesSchema.optional(),
  competencias: z.array(z.string()).optional(),
  historicoProfissional: z.array(HistoricoProfissionalSchema).optional(),
  formacaoAcademica: z.array(FormacaoAcademicaSchema).optional(),
});

export type PerfilCompleto = z.infer<typeof PerfilCompletoSchema>;

export const PerfilPublicoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  role: RoleSchema,
  bio: z.string().optional(),
  headline: z.string().optional(),
  avatarUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  reputacaoTier: ReputacaoTierSchema,
  regiao: z.string().optional(),
  areaInteresse: z.string().optional(),
  areasInteresse: z.array(z.string()).default([]),
  website: z.string().url().optional(),
  socialLinks: z.array(z.object({
    platform: z.string(),
    url: z.string().url(),
  })).default([]),
  competencias: z.array(z.string()).optional(),
  conquistas: z.array(z.object({
    id: z.string(),
    titulo: z.string(),
    icone: z.string(),
  })).optional(),
  projetos: z.array(z.object({
    id: z.string(),
    titulo: z.string(),
    capaUrl: z.string().optional(),
  })).optional(),
  historicoProfissional: z.array(HistoricoProfissionalSchema).optional(),
  formacaoAcademica: z.array(FormacaoAcademicaSchema).optional(),
});

export type PerfilPublico = z.infer<typeof PerfilPublicoSchema>;

export const PerfilPublicoBasicoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  avatarUrl: z.string().url().optional().nullable(),
  role: RoleSchema,
  reputacaoTier: ReputacaoTierSchema,
  bio: z.string().optional(),
  headline: z.string().optional(),
});

export type PerfilPublicoBasico = z.infer<typeof PerfilPublicoBasicoSchema>;
