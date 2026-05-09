import { z } from 'zod';

export const NotificacaoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  mensagem: z.string(),
  lida: z.boolean(),
  tipo: z.string(),
  link: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type Notificacao = z.infer<typeof NotificacaoSchema>;

export const ContadorNotificacoesSchema = z.object({
  total: z.number(),
  naoLidas: z.number(),
});

export type ContadorNotificacoes = z.infer<typeof ContadorNotificacoesSchema>;

export const NotificacaoRealtimeSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  mensagem: z.string(), // Substitui 'corpo' para manter consistência com o Strapi
  tipo: z.enum(['info', 'sucesso', 'aviso', 'erro', 'vinculo_pedido', 'vinculo_aprovado', 'vinculo_rejeitado', 'vinculo_terminado', 'conquista', 'sistema', 'aprovacao', 'rejeicao']),
  timestamp: z.string().datetime(),
});

export type NotificacaoRealtime = z.infer<typeof NotificacaoRealtimeSchema>;
