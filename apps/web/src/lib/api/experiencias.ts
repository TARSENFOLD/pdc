import { http } from './http';
import type { Experiencia, PaginationParams } from '@pdc/shared';

export const experienciasApi = {
  list: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    
    return http.get<{ data: Experiencia[], pagination: any }>(`/experiencias?${searchParams.toString()}`);
  },

  getById: (id: string) => 
    http.get<Experiencia>(`/experiencias/${id}`),

  getBySlug: (slug: string) => 
    http.get<Experiencia>(`/experiencias/slug/${slug}`),

  getByInstituicao: (instituicaoId: string) => 
    http.get<Experiencia[]>(`/experiencias/instituicao/${instituicaoId}`),
};
