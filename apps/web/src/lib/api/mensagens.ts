import { http } from './http';
import type { Conversa, Mensagem, PaginationParams } from '@pdc/shared';

export const mensagensApi = {
  getConversas: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    
    return http.get<{ data: Conversa[], pagination: any }>(`/mensagens/conversas?${searchParams.toString()}`);
  },

  getMensagens: (conversaId: string, params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    
    return http.get<{ data: Mensagem[], pagination: any }>(`/mensagens/conversas/${conversaId}?${searchParams.toString()}`);
  },

  enviar: (conversaId: string, conteudo: string) => 
    http.post<Mensagem>(`/mensagens/conversas/${conversaId}`, { conteudo }),

  marcarLida: (mensagemId: string) => 
    http.patch<Mensagem>(`/mensagens/${mensagemId}/lida`, { lida: true }),
};
