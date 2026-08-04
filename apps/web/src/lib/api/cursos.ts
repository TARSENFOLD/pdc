import { http } from './http';
import type { 
  Curso, 
  CursoFilters, 
  Inscricao, 
  InscricaoComCurso,
  ProgressoItem, 
  CriarCursoPayload, 
  CursoMeu, 
  Pagination 
} from '@pdc/shared';

export const cursosApi = {
  list: (filters?: CursoFilters) => {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.pageSize) params.set('pageSize', filters.pageSize.toString());
    if (filters?.search) params.set('search', filters.search);
    if (filters?.categoria) params.set('categoria', filters.categoria);
    if (filters?.autorId) params.set('autorId', filters.autorId);
    
    return http.get<{ data: Curso[], pagination: Pagination }>(`/cursos?${params.toString()}`);
  },

  getById: (id: string) => 
    http.get<Curso>(`/cursos/${id}`),

  getPreviewById: (id: string) =>
    http.get<Curso>(`/cursos/${id}?preview=true`),

  getBySlug: (slug: string) => 
    http.get<Curso>(`/cursos/slug/${slug}`),

  getMeus: (page?: number) =>
    http.get<{ data: CursoMeu[], pagination: Pagination }>(`/cursos/meus?page=${(page ?? 1).toString()}`),

  criar: (payload: CriarCursoPayload) =>
    http.post<CursoMeu>('/cursos', payload),

  create: (payload: CriarCursoPayload) =>
    http.post<CursoMeu>('/cursos', payload),

  editar: (id: string, payload: Partial<CriarCursoPayload>) =>
    http.put<CursoMeu>(`/cursos/${id}`, payload),

  update: (id: string, payload: Partial<CriarCursoPayload>) =>
    http.put<CursoMeu>(`/cursos/${id}`, payload),

  inscrever: (cursoId: string) => 
    http.post<Inscricao>(`/cursos/${cursoId}/inscricao`, {}),

  getProgresso: (cursoId: string) => 
    http.get<ProgressoItem[]>(`/cursos/${cursoId}/progresso`),

  updateProgresso: (cursoId: string, itemId: string, concluido: boolean) => 
    http.patch<ProgressoItem>(`/cursos/${cursoId}/progresso/${itemId}`, { concluido }),

  updateEstado: (id: string, estado: 'draft' | 'review' | 'published' | 'archived') =>
    estado === 'review'
      ? http.post<{ success: boolean }>(`/cursos/${id}/submeter`, {})
      : http.patch<{ success: boolean }>(`/cursos/${id}/estado`, { estado }),

  getMinhasInscricoes: () =>
    http.get<{ data: InscricaoComCurso[] }>('/cursos/me/inscricoes'),

  getCertificados: () =>
    http.get<{ data: InscricaoComCurso[] }>('/estudante/certificados'),
};
