import { z } from 'zod';
import { PerfilPublicoSchema } from '../user.js';

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
  participantes: z.array(PerfilPublicoSchema),
  ultimaMensagem: MensagemSchema.optional(),
  updatedAt: z.string().datetime(),
});

export type Conversa = z.infer<typeof ConversaSchema>;
