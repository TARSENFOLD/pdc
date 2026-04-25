import { http } from './http.js';
import type { Projeto, CriarProjetoPayload, ProjetoFilters, PedidoAcesso } from '@pdc/shared';

export const projetosApi = {
  list: (filters?: ProjetoFilters) => {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
    if (filters?.estudanteId) params.set('estudanteId', filters.estudanteId);
    if (filters?.cursoId) params.set('cursoId', filters.cursoId);
    if (filters?.tags) params.set('tags', filters.tags);

    return http.get<{ data: Projeto[]; pagination: { pageCount: number } }>(
      `/projetos?${params.toString()}`
    );
  },

  getById: (id: string) => http.get<Projeto>(`/projetos/${id}`),

  create: (payload: CriarProjetoPayload) =>
    http.post<Projeto>('/projetos', payload),

  update: (id: string, payload: Partial<CriarProjetoPayload>) =>
    http.put<Projeto>(`/projetos/${id}`, payload),

  remove: (id: string) => http.delete<{ ok: boolean }>(`/projetos/${id}`),

  requestAccess: (id: string, motivo?: string) =>
    http.post<PedidoAcesso>(`/projetos/${id}/pedidos-acesso`, { motivo }),

  respondPedido: (id: string, pedidoId: string, status: 'aprovado' | 'rejeitado') =>
    http.put<PedidoAcesso>(`/projetos/${id}/pedidos-acesso/${pedidoId}`, { status }),
};
