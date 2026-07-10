import { http } from './http';
import type { Notificacao, ContadorNotificacoes, PaginationParams, WebPushSubscriptionPayload } from '@pdc/shared';

export interface PushPublicKeyResponse {
  publicKey: string;
}

export interface PushRegisterPayload {
  token: string;
  platform: 'web';
  endpoint: string;
  p256dh: string;
  auth: string;
}

export const notificacoesApi = {
  list: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    
    return http.get<{ data: Notificacao[], pagination: { page: number; pageSize: number; pageCount: number; total: number } }>(`/notificacoes?${searchParams.toString()}`);
  },

  marcarLida: (id: string) => 
    http.put<Notificacao>(`/notificacoes/${id}/lida`, { lida: true }),

  marcarTodasLidas: () => 
    http.put<{ success: boolean }>('/notificacoes/lidas/todas', {}),

  getContador: () => 
    http.get<ContadorNotificacoes>('/notificacoes/contador'),

  getPushPublicKey: () =>
    http.get<PushPublicKeyResponse>('/notificacoes/push/public-key'),

  registerWebPush: (subscription: WebPushSubscriptionPayload) =>
    http.post<{ data: unknown }>('/notificacoes/push/register', {
      token: subscription.endpoint,
      platform: 'web',
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    } satisfies PushRegisterPayload),

  unregisterWebPush: (endpoint: string) =>
    http.delete<{ ok: true }>('/notificacoes/push/unregister', { token: endpoint }),
};
