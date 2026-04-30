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

export const EstadoEditorialSchema = z.enum(['draft', 'review', 'approved', 'published', 'rejected']);

export type EstadoEditorial = z.infer<typeof EstadoEditorialSchema>;
