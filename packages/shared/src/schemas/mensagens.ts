import { z } from 'zod';
export const MensagemSchema = z.object({
  id: z.string(),
  conversaId: z.string(),
  remetenteId: z.string(),
  conteudo: z.string(),
  lida: z.boolean(),
  createdAt: z.string().datetime(),
});

export type Mensagem = z.infer<typeof MensagemSchema>;

export const ConversaSchema = z.object({
  id: z.string(),
  interlocutorId: z.string(),
  interlocutorNome: z.string(),
  interlocutorFoto: z.string().url().nullable().optional(),
  ultimaMensagem: z.string().optional(),
  naoLidas: z.number().int().min(0),
  updatedAt: z.string().datetime(),
});

export type Conversa = z.infer<typeof ConversaSchema>;
