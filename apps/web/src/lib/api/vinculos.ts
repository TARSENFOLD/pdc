import { http } from './http';
import type { Vinculo, VinculoStatus, VinculoTipo, VinculoComPerfil, PerfilPublicoBasico, Pagination } from '@pdc/shared';

export const vinculosApi = {
  criar: (receiverId: string, connectionType: VinculoTipo) =>
    http.post<Vinculo>('/vinculos', { receiverId, connectionType }),

  getStatus: (targetId: string) =>
    http.get<VinculoStatus>(`/vinculos/status?targetId=${targetId}`),

  getPendentes: () =>
    http.get<{ data: VinculoComPerfil[] }>('/vinculos/pendentes'),

  getMeus: (tipo?: VinculoTipo, page = 1) => {
    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    params.set('page', page.toString());
    return http.get<{ data: VinculoComPerfil[]; pagination: Pagination }>(`/vinculos/meus?${params.toString()}`);
  },

  aceitarRejeitar: (id: string, acao: 'aceitar' | 'rejeitar') =>
    http.patch<Vinculo>(`/vinculos/${id}`, { acao }),

  remover: (id: string) =>
    http.delete<{ success: boolean }>(`/vinculos/${id}`),

  sugestoes: () =>
    http.get<{ data: PerfilPublicoBasico[] }>('/vinculos/sugestoes'),
};
