import { z } from 'zod';

export const SubscricaoTipoSchema = z.enum(['lti', 'individual', 'institucional']);
export type SubscricaoTipo = z.infer<typeof SubscricaoTipoSchema>;

export const SubscricaoLtiSchema = z.object({
  id: z.union([z.string(), z.number()]),
  documentId: z.string().optional(),
  tipo: z.literal('lti'),
  perfil: z.object({
    id: z.union([z.string(), z.number()]),
  }),
});

export type SubscricaoLti = z.infer<typeof SubscricaoLtiSchema>;
