import { z } from 'zod';

export const AreaVocacionalSchema = z.enum([
  'ENGENHARIA',
  'TECNOLOGIA',
  'SAUDE',
  'GESTAO',
  'ARTES',
  'CIENCIAS_SOCIAIS',
  'DIREITO',
  'EDUCACAO',
  'AGRONOMIA',
  'OUTRA'
]);

export type AreaVocacional = z.infer<typeof AreaVocacionalSchema>;

export const ModalidadeSchema = z.enum(['presencial', 'online', 'hibrido']);

export type Modalidade = z.infer<typeof ModalidadeSchema>;
