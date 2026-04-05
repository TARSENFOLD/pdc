import { http } from './http';
import type { Proposta, CriarPropostaPayload, PerfilCompleto } from '@pdc/shared';

export const propostasApi = {
  list: () =>
    http.get<{ data: Proposta[] }>('/propostas'),

  criar: (payload: CriarPropostaPayload) =>
    http.post<Proposta>('/propostas', payload),

  responder: (id: string, estado: 'aceite' | 'recusada') =>
    http.patch<Proposta>(`/propostas/${id}`, { estado }),
};

export const estudantesVinculadosApi = {
  list: () =>
    http.get<{ data: PerfilCompleto[] }>('/perfis/estudantes-vinculados'),
};
