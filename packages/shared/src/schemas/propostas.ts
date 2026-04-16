import { z } from 'zod';

export const PropostaEstadoSchema = z.enum(['pendente', 'aceite', 'recusada']);
export type PropostaEstado = z.infer<typeof PropostaEstadoSchema>;

export const PropostaTipoSchema = z.enum(['experiencia', 'programa', 'bolsa', 'emprego', 'estagio', 'parceria']);
export type PropostaTipo = z.infer<typeof PropostaTipoSchema>;

export const PropostaSchema = z.object({
  id: z.string(),
  instituicaoId: z.string(),
  estudanteId: z.string(),
  mensagem: z.string(),
  tipo: PropostaTipoSchema,
  estado: PropostaEstadoSchema,
  estudanteNome: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Proposta = z.infer<typeof PropostaSchema>;

export const CriarPropostaPayloadSchema = z.object({
  estudanteId: z.string(),
  titulo: z.string().min(5).optional(),
  descricao: z.string().min(10).optional(),
  tipo: PropostaTipoSchema.optional(),
  mensagem: z.string().max(500).optional(),
});

export type CriarPropostaPayload = z.infer<typeof CriarPropostaPayloadSchema>;
