import { http } from './http';
import type {
  InteractionTargetType,
  LikeStatus,
  ToggleLikePayload,
  BookmarkStatus,
  ToggleBookmarkPayload,
  Bookmark,
  RatingStats,
  CreateRatingPayload,
  Comment,
  CreateCommentPayload,
} from '@pdc/shared';

// ─── Likes ────────────────────────────────────────────────────────────────────
export const likeApi = {
  toggle: async (payload: ToggleLikePayload) => {
    return http.post<{ liked: boolean }>('/interactions/like', payload);
  },
  getStatus: async (targetType: InteractionTargetType, targetId: string) => {
    return http.get<LikeStatus>(`/interactions/like/status?targetType=${targetType}&targetId=${targetId}`);
  },
};

// ─── Bookmarks ────────────────────────────────────────────────────────────────
export const bookmarkApi = {
  toggle: async (payload: ToggleBookmarkPayload) => {
    return http.post<BookmarkStatus>('/interactions/bookmark', payload);
  },
  list: async () => {
    return http.get<{ data: Bookmark[] }>('/interactions/bookmarks');
  },
};

// ─── Ratings ──────────────────────────────────────────────────────────────────
export const ratingsApi = {
  create: async (payload: CreateRatingPayload) => {
    return http.post<{ success: boolean; created?: boolean; updated?: boolean }>('/ratings', payload);
  },
  getStats: async (targetType: InteractionTargetType, targetId: string) => {
    return http.get<RatingStats>(`/ratings/stats?targetType=${targetType}&targetId=${targetId}`);
  },
};

// ─── Comments ─────────────────────────────────────────────────────────────────
export const commentsApi = {
  create: async (payload: CreateCommentPayload) => {
    return http.post<{ data: Comment }>('/comments', payload);
  },
  list: async (targetType: InteractionTargetType, targetId: string) => {
    return http.get<{ data: Comment[] }>(`/comments/list?targetType=${targetType}&targetId=${targetId}`);
  },
};
