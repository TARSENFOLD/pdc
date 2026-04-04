import { http } from './http';
import type { FeedResponse, FeedItem } from '@pdc/shared';

export const feedApi = {
  getFeed: async (page = 1, pageSize = 10) => {
    const res = await http.get<FeedResponse>(`/feed?page=${String(page)}&pageSize=${String(pageSize)}`);
    return res;
  },

  getTrending: async () => {
    const res = await http.get<{ data: FeedItem[] }>('/feed/trending');
    return res.data;
  },
};
