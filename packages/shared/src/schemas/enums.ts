import { z } from 'zod';

export const RoleSchema = z.enum([
  'estudante',
  'mentor',
  'instituicao',
  'comite_cientifico',
  'moderador',
  'super_admin',
  'patrocinador'
]);

export type Role = z.infer<typeof RoleSchema>;

/**
 * Tolerant role schema for reading legacy values from persistent storage.
 * Legacy 'aluno' and 'admin' are accepted (case-insensitive) and coerced to canonical values.
 */
const LEGACY_ROLE_MAP: Record<string, Role> = { aluno: 'estudante', admin: 'super_admin' };

export const LegacyRoleSchema = z.union([
  RoleSchema,
  z.preprocess(
    (val) => (typeof val === 'string' ? LEGACY_ROLE_MAP[val.toLowerCase()] ?? val : val),
    RoleSchema,
  ),
]);

export type LegacyRole = z.infer<typeof LegacyRoleSchema>;

export const AreaVocacionalSchema = z.enum([
  'SAUDE',
  'ENGENHARIA',
  'TECNOLOGIA',
  'DIREITO',
  'GESTAO',
  'EDUCACAO',
  'ARTES',
  'CIENCIAS_AGRARIAS',
  'CIENCIAS_SOCIAIS',
  'COMUNICACAO',
  'CIENCIAS_NATURAIS',
  'ARQUITETURA',
  'TURISMO_HOTELARIA',
  'DESPORTO',
  'OUTRA'
]);

export type AreaVocacional = z.infer<typeof AreaVocacionalSchema>;

export const ModalidadeSchema = z.enum(['presencial', 'online', 'hibrido']);

export type Modalidade = z.infer<typeof ModalidadeSchema>;

export const EstadoEditorialSchema = z.enum(['draft', 'review', 'approved', 'published', 'rejected', 'hidden']);

export type EstadoEditorial = z.infer<typeof EstadoEditorialSchema>;
