import { http } from './http';
import type { Notificacao, ContadorNotificacoes, PaginationParams } from '@pdc/shared';

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
};
