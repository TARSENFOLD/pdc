import { http } from './http';
import type { 
  Simulacao, 
  SimulacaoFilters, 
  Tentativa, 
  IniciarTentativaPayload, 
  ConcluirTentativaPayload,
  Pagination,
  CriarSimulacaoPayload,
  SimulacaoMinha
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

  getMinhas: (page?: number) =>
    http.get<{ data: SimulacaoMinha[], pagination: Pagination }>(`/simulacoes/minhas?page=${page ?? 1}`),

  criar: (payload: CriarSimulacaoPayload) =>
    http.post<SimulacaoMinha>('/simulacoes', payload),

  editar: (id: string, payload: Partial<CriarSimulacaoPayload>) =>
    http.put<SimulacaoMinha>(`/simulacoes/${id}`, payload),

  updateEstado: (id: string, estado: 'review' | 'published' | 'archived') =>
    http.patch<{ success: boolean }>(`/simulacoes/${id}/estado`, { estado }),

  iniciarTentativa: (payload: IniciarTentativaPayload) => 
    http.post<Tentativa>(`/simulacoes/tentativas`, payload),

  concluirTentativa: (payload: ConcluirTentativaPayload) => 
    http.put<Tentativa>(`/simulacoes/tentativas/${payload.tentativaId}`, payload),

  getMinhasTentativas: (simulacaoId: string) => 
    http.get<Tentativa[]>(`/simulacoes/${simulacaoId}/minhas-tentativas`),
};
