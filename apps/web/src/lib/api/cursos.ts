import { http } from './http';
import type { Curso, CursoFilters, Inscricao, ProgressoItem } from '@pdc/shared';

export const cursosApi = {
  list: (filters?: CursoFilters) => {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.pageSize) params.set('pageSize', filters.pageSize.toString());
    if (filters?.search) params.set('search', filters.search);
    if (filters?.categoria) params.set('categoria', filters.categoria);
    if (filters?.autorId) params.set('autorId', filters.autorId);
    
    return http.get<{ data: Curso[], pagination: any }>(`/cursos?${params.toString()}`);
  },

  getById: (id: string) => 
    http.get<Curso>(`/cursos/${id}`),

  getBySlug: (slug: string) => 
    http.get<Curso>(`/cursos/slug/${slug}`),

  inscrever: (cursoId: string) => 
    http.post<Inscricao>(`/cursos/${cursoId}/inscrever`, {}),

  getProgresso: (cursoId: string) => 
    http.get<ProgressoItem[]>(`/cursos/${cursoId}/progresso`),

  updateProgresso: (cursoId: string, itemId: string, concluido: boolean) => 
    http.patch<ProgressoItem>(`/cursos/${cursoId}/progresso/${itemId}`, { concluido }),
};
