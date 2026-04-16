import { z } from 'zod';

export const AreaVocacionalSchema = z.enum([
  'ENGENHARIA',
  'SAUDE',
  'TECNOLOGIA',
  'AGRONOMIA',
  'GESTAO',
  'EDUCACAO',
  'DIREITO',
  'CIENCIAS_SOCIAIS',
  'ARTES',
  'OUTRO'
]);

export type AreaVocacional = z.infer<typeof AreaVocacionalSchema>;
