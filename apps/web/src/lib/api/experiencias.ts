import { http } from './http';
import type { Experiencia, ExperienciaMinha, CriarExperienciaPayload, PaginationParams, InstituicaoStats, MutationResult } from '@pdc/shared';

export const experienciasApi = {
  list: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    
    return http.get<{ data: Experiencia[], pagination: { page: number; pageSize: number; pageCount: number; total: number } }>(`/experiencias?${searchParams.toString()}`);
  },

  getById: (id: string) => 
    http.get<Experiencia>(`/experiencias/${id}`),

  getBySlug: (slug: string) => 
    http.get<Experiencia>(`/experiencias/slug/${slug}`),

  getByInstituicao: (instituicaoId: string) => 
    http.get<Experiencia[]>(`/experiencias/instituicao/${instituicaoId}`),

  getStats: () =>
    http.get<InstituicaoStats>('/experiencias/stats'),

  getMinhas: () =>
    http.get<{ data: ExperienciaMinha[] }>('/experiencias/minhas'),

  create: (payload: CriarExperienciaPayload) =>
    http.post<MutationResult>('/experiencias', payload),

  update: (id: string, payload: Partial<CriarExperienciaPayload>) =>
    http.put<Experiencia>(`/experiencias/${id}`, payload),
};
