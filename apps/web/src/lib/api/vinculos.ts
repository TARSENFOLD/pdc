import { http } from './http';
import type { Vinculo, VinculoComPerfil, PerfilPublicoBasico, VinculoTipo } from '@pdc/shared';

export const vinculosApi = {
  criar: (perfilId: string, connectionType: VinculoTipo) =>
    http.post<Vinculo>(`/vinculos/${perfilId}/pedir`, { connectionType }),

  getPendentes: () =>
    http.get<{ data: VinculoComPerfil[] }>('/vinculos/pendentes'),

  getMeus: () =>
    http.get<{ data: VinculoComPerfil[]; meta?: { pagination?: { total?: number } } }>('/vinculos'),

  aceitarRejeitar: (id: string, acao: 'aceitar' | 'rejeitar') =>
    http.patch<Vinculo>(`/vinculos/${id}/resolver`, { status: acao === 'aceitar' ? 'aprovado' : 'rejeitado' }),

  sugestoes: () =>
    http.get<{ data: PerfilPublicoBasico[] }>('/vinculos/sugestoes'),

  destinosPartilha: () =>
    http.get<{ data: Array<{ id: string; userId: string; nome: string; avatarUrl: string | null }> }>('/vinculos/partilha'),
};
