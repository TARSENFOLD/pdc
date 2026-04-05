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

  criar: (payload: CriarProgramaPayload) =>
    http.post<Programa>('/programas', payload),

  atualizar: (id: string, payload: Partial<CriarProgramaPayload>) =>
    http.put<Programa>(`/programas/${id}`, payload),
};
