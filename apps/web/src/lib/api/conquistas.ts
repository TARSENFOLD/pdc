import { http } from './http';
import type { Conquista, CriarConquistaManualPayload } from '@pdc/shared';

export type ConquistaManualResponse = Conquista & { eventId?: string };

export const conquistasApi = {
  minhas: () => http.get<{ data: Conquista[] }>('/conquistas/minhas'),

  verificar: (evento: string, referencia?: string) =>
    http.post<Conquista[]>('/conquistas/verificar', { evento, referencia }),

  createManual: (payload: CriarConquistaManualPayload) =>
    http.post<ConquistaManualResponse>('/conquistas/manual', payload),
};
