import { z } from 'zod';

export const UIContextoSchema = z.enum([
  'landing',
  'auth',
  'dashboard',
  'home',
  'cursos',
  'simulacoes',
  'global'
]);

export const UIStringSchema = z.object({
  key: z.string(),
  value: z.string(),
  contexto: UIContextoSchema,
  metadata: z.object({
    tom_de_voz: z.string().optional(),
    comentario_dev: z.string().optional()
  }).optional()
});

export type UIString = z.infer<typeof UIStringSchema>;

// Mapa de Copy para uso no Frontend (Gerado em Build-time)
export type CopyMap = Record<string, string>;
