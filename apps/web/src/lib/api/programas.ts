import { http } from './http';
import type { Programa, CriarProgramaPayload } from '@pdc/shared';

export const programasApi = {
  list: (params?: { page?: number; pageSize?: number; search?: string; tipo?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.tipo) searchParams.set('tipo', params.tipo);
    return http.get<{ data: Programa[] }>(`/programas?${searchParams.toString()}`);
  },

  getMeus: () =>
    http.get<{ data: Programa[] }>('/programas/meus'),

  create: (payload: CriarProgramaPayload) =>
    http.post<Programa>('/programas', payload),

  update: (id: string, payload: Partial<CriarProgramaPayload>) =>
    http.put<Programa>(`/programas/${id}`, payload),

  getById: (id: string) => http.get<Programa>(`/programas/${id}`),
  inscrever: (id: string, inviteCode?: string) => http.post<{ success: boolean; inscricaoId: string }>(`/programas/${id}/inscricao`, { inviteCode }),
};
