import { http } from './http.js';
import type { Projeto, CriarProjetoPayload, ProjetoFilters, ProjetoEstado, PedidoAcesso } from '@pdc/shared';

export const projetosApi = {
  list: (filters?: ProjetoFilters) => {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
    if (filters?.estudanteId) params.set('estudanteId', filters.estudanteId);
    if (filters?.cursoId) params.set('cursoId', filters.cursoId);
    if (filters?.tags) params.set('tags', filters.tags);
    if (filters?.estado) params.set('estado', filters.estado);
    if (filters?.area) params.set('area', filters.area);
    if (filters?.modos) params.set('modos', filters.modos);

    return http.get<{ data: Projeto[]; pagination: { pageCount: number } }>(
      `/projetos?${params.toString()}`
    );
  },

  meusProjetos: () =>
    http.get<{ data: Projeto[]; pagination: { pageCount: number } }>('/projetos/meus'),

  getById: (id: string) => http.get<{ data: Projeto[] }>(`/projetos/${id}`),

  transitionState: (id: string, novoEstado: ProjetoEstado, motivo?: string) =>
    http.patch<{ success: boolean; estado: string }>(`/projetos/${id}/estado`, { novoEstado, motivo }),

  create: (payload: CriarProjetoPayload) =>
    http.post<Projeto>('/projetos', payload),

  update: (id: string, payload: Partial<CriarProjetoPayload>) =>
    http.put<Projeto>(`/projetos/${id}`, payload),

  gerirACL: (id: string, perfilId: string, acao: 'aprovar' | 'rejeitar' | 'remover') =>
    http.patch<{ success: boolean }>(`/projetos/${id}/acl`, { perfilId, acao }),

  listAccessRequests: (id: string) =>
    http.get<{ data: PedidoAcesso[] }>(`/projetos/${id}/pedidos-acesso`),

  respondAccessRequest: (id: string, pedidoId: string, status: 'aprovado' | 'rejeitado') =>
    http.patch<{ success: boolean }>(`/projetos/${id}/pedidos-acesso/${pedidoId}`, { status }),

  remove: (id: string) => http.delete<{ ok: boolean }>(`/projetos/${id}`),

  requestAccess: (id: string, motivo?: string) =>
    http.post<{ success: boolean; pedido?: PedidoAcesso }>(`/projetos/${id}/pedidos-acesso`, motivo ? { motivo } : {}),

  getVotes: (id: string) =>
    http.get<{ endorsements: number; votos_count: number; endorsed: boolean; voted: boolean }>(`/projetos/${id}/votos`),

  vote: (id: string, tipo: 'endorsement' | 'voto', comentario?: string) =>
    http.post<{ count: number; voted: boolean }>(`/projetos/${id}/votos`, { tipo, comentario }),

  unvote: (id: string, tipo: 'endorsement' | 'voto') =>
    http.delete<{ count: number; voted: boolean }>(`/projetos/${id}/votos?tipo=${tipo}`),
};
