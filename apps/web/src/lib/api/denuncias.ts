import { http } from './http.js';
import type { 
  Denuncia, 
  DenunciaListParams, 
  Pagination, 
  CriarDenunciaPayload, 
  ResolverDenunciaPayload 
} from '@pdc/shared';

export const denunciasApi = {
  list: (params: DenunciaListParams) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page.toString());
    if (params.pageSize) q.set('pageSize', params.pageSize.toString());
    if (params.estado) q.set('estado', params.estado);
    if (params.tipo) q.set('tipo', params.tipo);
    return http.get<{ data: Denuncia[]; pagination: Pagination }>(`/denuncias?${q.toString()}`);
  },

  getById: (id: string) =>
    http.get<{ data: Denuncia }>(`/denuncias/${id}`),

  resolver: (id: string, body: ResolverDenunciaPayload) =>
    http.put(`/denuncias/${id}/resolver`, body),

  criar: (body: CriarDenunciaPayload) =>
    http.post('/denuncias', body),
};
