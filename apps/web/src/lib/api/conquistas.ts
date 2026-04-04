import { http } from './http';
import type { Conquista } from '@pdc/shared';

export const conquistasApi = {
  minhas: () => http.get<{ data: Conquista[] }>('/conquistas/minhas'),

  verificar: (evento: string, referencia?: string) =>
    http.post<Conquista[]>('/conquistas/verificar', { evento, referencia }),
};
