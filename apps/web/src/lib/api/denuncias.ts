import { apiClient } from './http.js';
import type { Denuncia, DenunciaListParams } from '@pdc/shared';

export const denunciasApi = {
  list: (params: DenunciaListParams) =>
    apiClient.get<{ data: Denuncia[]; pagination: any }>('/denuncias', { params }),

  getById: (id: string) =>
    apiClient.get<{ data: Denuncia }> (`/denuncias/${id}`),

  resolver: (id: string, body: { accao: 'remover' | 'avisar' | 'ignorar'; nota: string }) =>
    apiClient.put(`/denuncias/${id}/resolver`, body),

  criar: (body: { conteudoId: string; conteudoTipo: string; motivo: string }) =>
    apiClient.post('/denuncias', body),
};
