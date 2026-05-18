import { z } from 'zod';

export const InteractionTargetTypeSchema = z.enum([
  'curso',
  'simulacao',
  'experiencia',
  'projeto',
  'mentor',
  'instituicao',
  'post',
  'conquista',
]);

export type InteractionTargetType = z.infer<typeof InteractionTargetTypeSchema>;

// Likes
export const LikeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
  createdAt: z.string().datetime(),
});

export type Like = z.infer<typeof LikeSchema>;

export const LikeStatusSchema = z.object({
  liked: z.boolean(),
  count: z.number().int().min(0),
});

export type LikeStatus = z.infer<typeof LikeStatusSchema>;

export const ToggleLikePayloadSchema = z.object({
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
});

export type ToggleLikePayload = z.infer<typeof ToggleLikePayloadSchema>;

// Bookmarks
export const BookmarkSchema = z.object({
  id: z.string(),
  userId: z.string(),
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
  createdAt: z.string().datetime(),
});

export type Bookmark = z.infer<typeof BookmarkSchema>;

export const BookmarkStatusSchema = z.object({
  bookmarked: z.boolean(),
});

export type BookmarkStatus = z.infer<typeof BookmarkStatusSchema>;

export const ToggleBookmarkPayloadSchema = z.object({
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
});

export type ToggleBookmarkPayload = z.infer<typeof ToggleBookmarkPayloadSchema>;

// Ratings
export const RatingSchema = z.object({
  id: z.string(),
  userId: z.string(),
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
  valor: z.number().int().min(1).max(5),
  createdAt: z.string().datetime(),
});

export type Rating = z.infer<typeof RatingSchema>;

export const RatingStatsSchema = z.object({
  media: z.number().min(0).max(5),
  total: z.number().int().min(0),
  userRating: z.number().int().min(1).max(5).nullable(),
});

export type RatingStats = z.infer<typeof RatingStatsSchema>;

export const CreateRatingPayloadSchema = z.object({
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
  valor: z.number().int().min(1).max(5),
});

export type CreateRatingPayload = z.infer<typeof CreateRatingPayloadSchema>;

// Shares
export const SharePayloadSchema = z.object({
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
});

export type SharePayload = z.infer<typeof SharePayloadSchema>;
