import { http } from './http';
import type { Mentoria, SolicitarMentoriaPayload } from '@pdc/shared';

export const mentoriasApi = {
  list: () => http.get<{ data: Mentoria[] }>('/mentorias'),

  solicitar: (payload: SolicitarMentoriaPayload) =>
    http.post<Mentoria>('/mentorias', payload),

  aceitar: (id: string) => http.put<Mentoria>(`/mentorias/${id}/aceitar`, {}),

  recusar: (id: string, motivo?: string) =>
    http.put<Mentoria>(`/mentorias/${id}/recusar`, { motivo }),

  concluir: (id: string) => http.put<Mentoria>(`/mentorias/${id}/concluir`, {}),
};
