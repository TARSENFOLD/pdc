import { z } from 'zod';

export const MentoriaEstadoSchema = z.enum([
  'pendente',
  'aceite',
  'recusada',
  'concluida',
]);

export type MentoriaEstado = z.infer<typeof MentoriaEstadoSchema>;

export const MentoriaSchema = z.object({
  id: z.string(),
  alunoId: z.string(),
  mentorId: z.string(),
  mensagem: z.string(),
  estado: MentoriaEstadoSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Mentoria = z.infer<typeof MentoriaSchema>;

export const MentoriaTipoSchema = z.enum([
  'orientacao_vocacional',
  'acompanhamento_curso',
  'revisao_projeto',
]);
export type MentoriaTipo = z.infer<typeof MentoriaTipoSchema>;

export const SolicitarMentoriaPayloadSchema = z.object({
  mentorId: z.string().min(1),
  mensagem: z.string().min(10).max(500),
  tipo: MentoriaTipoSchema,
  preco: z.number().min(0).default(0),
  cursoId: z.string().optional(),
  projetoId: z.string().optional(),
});
export type SolicitarMentoriaPayload = z.infer<typeof SolicitarMentoriaPayloadSchema>;
