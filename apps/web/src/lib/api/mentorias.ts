import { http } from './http';
import type { 
  Mentoria, 
  MentorStats,
  Inscricao,
  Pagination,
  MentoriaTipo,
} from '@pdc/shared';

export interface EstudanteMentorado {
  id: string;
  estudanteId: string;
  estudanteNome: string;
  estudanteEmail: string;
  mentoriaId: string;
  tipo: MentoriaTipo;
  estado: string;
  criadaEm: string;
}

interface SolicitarPayload {
  mentorId: string;
  mensagem: string;
  tipo: MentoriaTipo;
  preco: number;
  cursoId?: string;
  projetoId?: string;
}

export const mentoriasApi = {
  list: () => http.get<{ data: Mentoria[] }>('/mentorias'),

  solicitar: (payload: SolicitarPayload) =>
    http.post<Mentoria>('/mentorias', payload),

  aceitar: (id: string) => http.put<Mentoria>(`/mentorias/${id}/aceitar`, {}),

  recusar: (id: string, motivo?: string) =>
    http.put<Mentoria>(`/mentorias/${id}/recusar`, { motivo }),

  concluir: (id: string) => http.put<Mentoria>(`/mentorias/${id}/concluir`, {}),

  getStats: () => http.get<MentorStats>('/mentorias/stats'),

  getMentorados: () => http.get<EstudanteMentorado[]>('/mentorias/mentorados'),

  getEstudantesInscritos: (page?: number) =>
    http.get<{ data: Inscricao[], pagination: Pagination }>(`/mentorias/estudantes/inscritos?page=${(page ?? 1).toString()}`),
};
