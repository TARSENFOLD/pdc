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
  getCourseDiscussions: (cursoId: string, page = 1, limit = 20) =>
    http.get<PaginatedResponse<Discussion>>(`/discussions/course/${cursoId}?page=${page}&limit=${limit}`),

  createDiscussion: (data: { titulo: string; corpo: string; cursoId: number }) =>
    http.post<{ data: Discussion }>('/discussions', data),

  getReplies: (id: string, page = 1, limit = 50) =>
    http.get<PaginatedResponse<DiscussionReply>>(`/discussions/${id}/replies?page=${page}&limit=${limit}`),

  postReply: (id: string, data: { texto: string; paiId?: number }) =>
    http.post<{ data: DiscussionReply }>(`/discussions/${id}/replies`, data),

  pin: (id: string, pinned: boolean) =>
    http.put<{ success: boolean }>(`/discussions/${id}/pin`, { pinned }),

  resolve: (id: string, resolved: boolean) =>
    http.put<{ success: boolean }>(`/discussions/${id}/resolve`, { resolved }),
};
