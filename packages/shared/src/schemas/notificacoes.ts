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

export const WebPushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const WebPushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: WebPushSubscriptionKeysSchema,
});

export type WebPushSubscriptionPayload = z.infer<typeof WebPushSubscriptionSchema>;

export const WebPushNotificationPayloadSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  url: z.string().max(2048).optional(),
  icon: z.string().max(2048).optional(),
  badge: z.string().max(2048).optional(),
  tag: z.string().max(128).optional(),
  data: z.record(z.unknown()).optional(),
}).refine(
  (payload) => new TextEncoder().encode(JSON.stringify(payload)).length <= 4096,
  { message: 'Payload excede o limite seguro de tamanho para Web Push (4KB)' },
);

export type WebPushNotificationPayload = z.infer<typeof WebPushNotificationPayloadSchema>;
