import { http } from './http';
import {
  InstituicaoStatsSchema,
  ExperienciasMinhasResponseSchema,
  type Experiencia,
  type ExperienciaMinha,
  type CriarExperienciaPayload,
  type PaginationParams,
  type InstituicaoStats,
  type MutationResult,
  type ProgressoExperienciaPayload,
  type ParticipacaoExperiencia,
} from '@pdc/shared';

export const experienciasApi = {
  list: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    return http.get<{
      data: Experiencia[];
      pagination: { page: number; pageSize: number; pageCount: number; total: number };
    }>(`/experiencias?${searchParams.toString()}`);
  },

  getById: (id: string) => http.get<Experiencia>(`/experiencias/${id}`),

  getMineById: (id: string) => http.get<ExperienciaMinha>(`/experiencias/minhas/${id}`),

  getBySlug: (slug: string) => http.get<Experiencia>(`/experiencias/slug/${slug}`),

  getByInstituicao: (instituicaoId: string) =>
    http.get<Experiencia[]>(`/experiencias/instituicao/${instituicaoId}`),

  getStats: () => http.getParsed<InstituicaoStats>('/experiencias/stats', InstituicaoStatsSchema),

  getMinhas: (page = 1) =>
    http.getParsed(
      `/experiencias/minhas?page=${page}&pageSize=12`,
      ExperienciasMinhasResponseSchema
    ),

  create: (payload: CriarExperienciaPayload) => http.post<MutationResult>('/experiencias', payload),

  update: (id: string, payload: Partial<CriarExperienciaPayload>) =>
    http.put<Experiencia>(`/experiencias/${id}`, payload),

  updateEstado: (id: string, estado: string, motivo?: string) =>
    estado === 'review'
      ? http.post<{ success: boolean }>(`/experiencias/${id}/submeter`, {})
      : http.patch<{ success: boolean }>(`/experiencias/${id}/estado`, {
          estado,
          ...(motivo ? { motivo } : {}),
        }),

  inscrever: (id: string) =>
    http.post<ParticipacaoExperiencia>(`/experiencias/${id}/inscrever`, {}),
  participacao: (id: string) =>
    http.get<{ participacao: ParticipacaoExperiencia | null; experiencia?: Experiencia }>(
      `/experiencias/${id}/participacao`
    ),
  progresso: (id: string, payload: ProgressoExperienciaPayload) =>
    http.put<ParticipacaoExperiencia>(`/experiencias/${id}/progresso`, payload),
  validarParceiro: (id: string, payload: { responsavel: string; referencia: string }) =>
    http.post<{ success: boolean }>(`/experiencias/${id}/validacao-parceiro`, payload),
};
