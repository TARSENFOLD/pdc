import { http } from './http';
import type { 
  Simulacao, 
  SimulacaoFilters, 
  Tentativa, 
  IniciarTentativaPayload, 
  ConcluirTentativaPayload,
  Pagination
} from '@pdc/shared';

export const simulacoesApi = {
  list: (filters?: SimulacaoFilters) => {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.pageSize) params.set('pageSize', filters.pageSize.toString());
    if (filters?.search) params.set('search', filters.search);
    if (filters?.tipo) params.set('tipo', filters.tipo.toString());
    
    return http.get<{ data: Simulacao[], pagination: Pagination }>(`/simulacoes?${params.toString()}`);
  },

  getById: (id: string) => 
    http.get<Simulacao>(`/simulacoes/${id}`),

  iniciarTentativa: (payload: IniciarTentativaPayload) => 
    http.post<Tentativa>(`/simulacoes/${payload.simulacaoId}/tentativas`, payload),

  concluirTentativa: (payload: ConcluirTentativaPayload) => 
    http.put<Tentativa>(`/simulacoes/tentativas/${payload.tentativaId}/concluir`, payload),

  getMinhasTentativas: (simulacaoId: string) => 
    http.get<Tentativa[]>(`/simulacoes/${simulacaoId}/minhas-tentativas`),
};
