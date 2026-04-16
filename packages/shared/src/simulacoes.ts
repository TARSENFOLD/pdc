import { z } from 'zod';
import { EstadoEditorialSchema } from './user.js';
import { AreaVocacionalSchema } from './schemas/enums.js';

export const SimulacaoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  tipo: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  capaUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  iframeUrl: z.string().url().optional(),
});

export type Simulacao = z.infer<typeof SimulacaoSchema>;

export const CriarSimulacaoPayloadSchema = z.object({
  titulo: z.string().min(3).max(120),
  descricao: z.string().min(10).max(2000),
  area: AreaVocacionalSchema,
  tipo: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  capaUrl: z.string().url().optional(),
  iframeUrl: z.string().url().optional(),
});

export type CriarSimulacaoPayload = z.infer<typeof CriarSimulacaoPayloadSchema>;

export const SimulacaoMinhaSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional(),
  area: AreaVocacionalSchema.optional(),
  tipo: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  nivel: z.string().optional(),
  estado: EstadoEditorialSchema,
  autorId: z.string(),
});

export type SimulacaoMinha = z.infer<typeof SimulacaoMinhaSchema>;
