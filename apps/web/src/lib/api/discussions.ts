import { http } from './http';

export interface Discussion {
  id: number;
  documentId?: string;
  titulo: string;
  corpo: string;
  autorId: string;
  pinned: boolean;
  resolved: boolean;
  createdAt: string;
  curso?: { id: number };
}

export interface DiscussionReply {
  id: number;
  documentId?: string;
  texto: string;
  autorId: string;
  createdAt: string;
  pai?: { id: number } | null;
}

interface PaginatedResponse<T> {
  data: T[];
  meta?: { pagination?: { page: number; pageCount: number; total: number } };
}

export const discussionsApi = {
  list: (cursoId: string, page = 1, limit = 20) =>
    http.get<PaginatedResponse<Discussion>>(`/discussions/course/${cursoId}?page=${page.toString()}&limit=${limit.toString()}`),

  create: (cursoId: string, titulo: string, corpo: string) =>
    http.post<{ data: Discussion }>('/discussions', { titulo, corpo, cursoId: parseInt(cursoId, 10) }),

  getReplies: (id: string, page = 1, limit = 50) =>
    http.get<PaginatedResponse<DiscussionReply>>(`/discussions/${id}/replies?page=${page.toString()}&limit=${limit.toString()}`),

  reply: (id: string, data: { texto: string; paiId?: number }) =>
    http.post<{ data: DiscussionReply }>(`/discussions/${id}/replies`, data),

  pin: (id: string, pinned: boolean) =>
    http.put<{ success: boolean }>(`/discussions/${id}/pin`, { pinned }),

  resolve: (id: string, resolved: boolean) =>
    http.put<{ success: boolean }>(`/discussions/${id}/resolve`, { resolved }),
};
