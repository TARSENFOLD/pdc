import { http } from './http';
import type { CriarPostPayload, FeedPost, FeedResponse, FeedWeights, UpdateFeedWeightsPayload } from '@pdc/shared';

export const feedApi = {
  getTrending: (page = 1, limit = 20) =>
    http.get<FeedResponse>(`/feed/trending?page=${String(page)}&limit=${String(limit)}`),

  getGeral: (page = 1, limit = 20) =>
    http.get<FeedResponse>(`/feed/geral?page=${String(page)}&limit=${String(limit)}`),

  getWeights: (tipo: 'geral' | 'trending') =>
    http.get<FeedWeights>(`/feed/weights/${tipo}`),

  updateWeights: (tipo: 'geral' | 'trending', payload: UpdateFeedWeightsPayload) =>
    http.put<{ success: boolean }>(`/feed/weights/${tipo}`, payload),

  getPost: (id: string) =>
    http.get<FeedPost>(`/feed-posts/${id}`),

  createPost: (payload: CriarPostPayload) =>
    http.post<FeedPost>('/feed-posts', payload),

  updatePost: (id: string, payload: CriarPostPayload) =>
    http.put<FeedPost>(`/feed-posts/${id}`, payload),

  sharePost: (id: string) =>
    http.post<{ success: boolean; sharesCount: number }>(`/feed-posts/${id}/share`, {}),
};
