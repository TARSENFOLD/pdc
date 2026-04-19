import { z } from 'zod';

export const TentativaSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  simulacaoId: z.string(),
  perfilId: z.string().optional(),
  dataInicio: z.string(),
  dataFim: z.string().optional(),
  status: z.enum(['em_progresso', 'concluida', 'abandonada']),
  score: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  tentativaNum: z.number(),
});

export type Tentativa = z.infer<typeof TentativaSchema>;
