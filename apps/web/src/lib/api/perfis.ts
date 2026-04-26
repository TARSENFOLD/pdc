import { http } from './http';
import type { PerfilCompleto, UpdatePerfilPayload, Role, EstudanteStats } from '@pdc/shared';

export const perfisApi = {
  getById: (id: string) => 
    http.get<PerfilCompleto>(`/perfis/${id}`),

  getMe: () => 
    http.get<PerfilCompleto>('/perfis/me'),

  update: (payload: UpdatePerfilPayload) => 
    http.put<PerfilCompleto>('/perfis/me', payload),

  getByRole: (role: Role) => 
    http.get<PerfilCompleto[]>(`/perfis?role=${role}`),

  getMyStats: () =>
    http.get<EstudanteStats>('/perfis/me/stats'),
};
