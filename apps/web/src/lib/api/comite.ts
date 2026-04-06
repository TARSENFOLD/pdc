import { http } from './http';

interface ItemFila {
  id: string;
  titulo?: string;
  autorNome?: string;
  submittedAt?: string;
  tipo: string;
}

interface FilaResponse {
  data: ItemFila[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
}

export const comiteApi = {
  getFila: (tipo: 'simulacao' | 'experiencia', page = 1) =>
    http.get<FilaResponse>(`/comite/fila?tipo=${tipo}&page=${String(page)}`),
  validar: (tipo: string, id: string, payload: { acao: 'aprovar' | 'rejeitar'; parecer: string }) =>
    http.put<{ success: boolean; estado: string }>(`/comite/${tipo}/${id}/validar`, payload),
};
