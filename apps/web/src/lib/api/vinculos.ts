import { http } from './http';
import type { Vinculo, VinculoComPerfil, PerfilPublicoBasico } from '@pdc/shared';

export const vinculosApi = {
  criar: (perfilId: string) =>
    http.post<Vinculo>(`/vinculos/${perfilId}/pedir`, {}),

  getPendentes: () =>
    http.get<{ data: VinculoComPerfil[] }>('/vinculos/pendentes'),

  getMeus: () =>
    http.get<{ data: VinculoComPerfil[]; meta?: { pagination?: { total?: number } } }>('/vinculos'),

  aceitarRejeitar: (id: string, acao: 'aceitar' | 'rejeitar') =>
    http.patch<Vinculo>(`/vinculos/${id}/resolver`, { status: acao === 'aceitar' ? 'aprovado' : 'rejeitado' }),

  sugestoes: () =>
    http.get<{ data: PerfilPublicoBasico[] }>('/vinculos/sugestoes'),
};
