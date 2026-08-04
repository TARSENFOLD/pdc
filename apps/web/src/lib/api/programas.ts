import { http } from './http';
import type { Programa, CriarProgramaPayload } from '@pdc/shared';

export type InscricaoPrograma = {
  id: string;
  programa?: {
    id: string;
    titulo: string;
    tipo: string;
    area: string;
    estado: string;
    capaUrl?: string | null;
    modalidade?: string;
    instituicao?: { id: string; nome?: string };
  };
  concluido?: boolean;
  dataConclusao?: string;
};

export const programasApi = {
  list: (params?: { page?: number; pageSize?: number; search?: string; tipo?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.tipo) searchParams.set('tipo', params.tipo);
    return http.get<{ data: Programa[] }>(`/programas?${searchParams.toString()}`);
  },

  // Inscrições do utilizador autenticado (estudante)
  getMeus: () =>
    http.get<{ data: InscricaoPrograma[] }>('/programas/meus'),

  // Programas criados pelo utilizador (instituição/mentor)
  getMinhas: () =>
    http.get<{ data: Programa[] }>('/programas/minhas'),

  create: (payload: CriarProgramaPayload) =>
    http.post<Programa>('/programas', payload),

  update: (id: string, payload: Partial<CriarProgramaPayload>) =>
    http.put<Programa>(`/programas/${id}`, payload),

  getById: (id: string) => http.get<Programa>(`/programas/${id}`),

  getPreviewById: (id: string) => http.get<Programa>(`/programas/${id}?preview=true`),

  inscrever: (id: string) =>
    http.post<{ id: string }>(`/programas/${id}/inscricao`, {}),

  concluir: (id: string) =>
    http.post<{ success: boolean }>(`/programas/${id}/concluir`, {}),

  updateEstado: (id: string, estado: string) =>
    estado === 'review'
      ? http.post<{ success: boolean }>(`/programas/${id}/submeter`, {})
      : http.patch<{ success: boolean }>(`/programas/${id}/estado`, { estado }),
};
