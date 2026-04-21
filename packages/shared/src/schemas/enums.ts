import { z } from 'zod';

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

export const EstadoEditorialSchema = z.enum(['draft', 'review', 'published', 'rejected']);

export type EstadoEditorial = z.infer<typeof EstadoEditorialSchema>;
