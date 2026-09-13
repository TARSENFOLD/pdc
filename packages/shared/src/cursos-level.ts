import { z } from 'zod';

export const CursoNivelSchema = z.enum(['basico', 'medio', 'avancado']);

export type CursoNivel = z.infer<typeof CursoNivelSchema>;
