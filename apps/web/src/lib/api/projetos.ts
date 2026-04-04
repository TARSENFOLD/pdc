import { http } from './http';
import type { Projeto, CreateProjetoPayload } from '@pdc/shared';

export interface ProjetoFilters {
  page?: number;
  pageSize?: number;
  alunoId?: string;
  cursoId?: string;
  tags?: string;
}

export const projetosApi = {
  list: (filters?: ProjetoFilters) => {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.pageSize) params.set('pageSize', filters.pageSize.toString());
    if (filters?.alunoId) params.set('alunoId', filters.alunoId);
    if (filters?.cursoId) params.set('cursoId', filters.cursoId);
    if (filters?.tags) params.set('tags', filters.tags);

    return http.get<{ data: Projeto[]; pagination: { pageCount: number } }>(
      `/projetos?${params.toString()}`
    );
  },

  getById: (id: string) => http.get<Projeto>(`/projetos/${id}`),

  create: (payload: CreateProjetoPayload) =>
    http.post<Projeto>('/projetos', payload),

  update: (id: string, payload: Partial<CreateProjetoPayload>) =>
    http.put<Projeto>(`/projetos/${id}`, payload),

  remove: (id: string) => http.delete<{ ok: boolean }>(`/projetos/${id}`),
};
