import { z } from 'zod';

export const PropostaTipoSchema = z.enum(['emprego', 'estagio', 'bolsa', 'parceria']);
export type PropostaTipo = z.infer<typeof PropostaTipoSchema>;

export const PropostaSchema = z.object({
  id: z.string(),
  tipo: PropostaTipoSchema,
  titulo: z.string(),
  mensagem: z.string(),
  targetId: z.string(), // Aluno ou Instituição
  senderId: z.string(),
  estado: z.enum(['pendente', 'aceite', 'rejeitada']),
  status: z.enum(['pendente', 'aceita', 'recusada', 'rejeitada']).optional(), // Suporte a status (alias de estado)
  createdAt: z.string().datetime(),
});

export type Proposta = z.infer<typeof PropostaSchema>;

export const CriarPropostaPayloadSchema = PropostaSchema.omit({
  id: true,
  createdAt: true,
  estado: true,
  senderId: true,
});

export type CriarPropostaPayload = z.infer<typeof CriarPropostaPayloadSchema>;
