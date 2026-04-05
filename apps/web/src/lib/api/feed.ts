import { http } from './http';
import type { FeedResponse, FeedWeights, UpdateFeedWeightsPayload } from '@pdc/shared';

export const feedApi = {
  getTrending: (page = 1, limit = 20) =>
    http.get<FeedResponse>(`/feed/trending?page=${String(page)}&limit=${String(limit)}`),

  getGeral: (page = 1, limit = 20) =>
    http.get<FeedResponse>(`/feed/geral?page=${String(page)}&limit=${String(limit)}`),

  getWeights: (tipo: 'geral' | 'trending') =>
    http.get<FeedWeights>(`/feed/weights/${tipo}`),

  updateWeights: (tipo: 'geral' | 'trending', payload: UpdateFeedWeightsPayload) =>
    http.put<{ success: boolean }>(`/feed/weights/${tipo}`, payload),
};
