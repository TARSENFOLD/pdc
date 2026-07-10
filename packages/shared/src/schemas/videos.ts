import { z } from 'zod';

const OptionalUrlSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional(),
);

export const VideoProviderSchema = z.enum([
  'youtube',
  'vimeo',
  'loom',
  'r2',
  'bunny',
  'mux',
  'cloudflare',
]);

export type VideoProvider = z.infer<typeof VideoProviderSchema>;

export const VideoModeSchema = z.enum(['external', 'quick_upload', 'professional_upload']);
export type VideoMode = z.infer<typeof VideoModeSchema>;

export const VideoVisibilitySchema = z.enum(['public', 'protected', 'private']);
export type VideoVisibility = z.infer<typeof VideoVisibilitySchema>;

export const VideoStatusSchema = z.enum([
  'draft',
  'pending_upload',
  'uploaded',
  'processing',
  'ready',
  'failed',
  'archived',
]);

export type VideoStatus = z.infer<typeof VideoStatusSchema>;

export const VideoChapterSchema = z.object({
  title: z.string().min(1),
  startSeconds: z.number().int().min(0),
});

export const VideoSubtitleSchema = z.object({
  label: z.string().min(1),
  language: z.string().min(2).max(12),
  url: z.string().url(),
});

export const VideoSchema = z.object({
  id: z.string(),
  provider: VideoProviderSchema,
  mode: VideoModeSchema,
  visibility: VideoVisibilitySchema,
  status: VideoStatusSchema,
  ownerId: z.string(),
  title: z.string().min(1).max(180),
  durationSeconds: z.number().int().positive().optional(),
  sizeBytes: z.number().int().positive().optional(),
  mimeType: z.string().min(1).optional(),
  thumbnailUrl: OptionalUrlSchema,
  originalKey: z.string().min(1).optional(),
  streamUrl: OptionalUrlSchema,
  externalUrl: OptionalUrlSchema,
  chapters: z.array(VideoChapterSchema).optional(),
  subtitles: z.array(VideoSubtitleSchema).optional(),
  failureReason: z.string().max(500).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Video = z.infer<typeof VideoSchema>;

export const CreateExternalVideoPayloadSchema = z.object({
  provider: VideoProviderSchema.exclude(['r2']),
  visibility: VideoVisibilitySchema.default('public'),
  title: z.string().min(1).max(180),
  externalUrl: z.string().url(),
  thumbnailUrl: OptionalUrlSchema,
  durationSeconds: z.number().int().positive().optional(),
});

export type CreateExternalVideoPayload = z.infer<typeof CreateExternalVideoPayloadSchema>;

export const CreateR2VideoPayloadSchema = z.object({
  mode: z.enum(['quick_upload', 'professional_upload']).default('quick_upload'),
  visibility: VideoVisibilitySchema.default('protected'),
  title: z.string().min(1).max(180),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export type CreateR2VideoPayload = z.infer<typeof CreateR2VideoPayloadSchema>;

export const CreateR2VideoResponseSchema = z.object({
  video: VideoSchema,
  uploadUrl: z.string().url(),
  key: z.string(),
});

export type CreateR2VideoResponse = z.infer<typeof CreateR2VideoResponseSchema>;

export const ConfirmVideoUploadPayloadSchema = z.object({
  key: z.string().min(1),
  sizeBytes: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  thumbnailUrl: OptionalUrlSchema,
});

export type ConfirmVideoUploadPayload = z.infer<typeof ConfirmVideoUploadPayloadSchema>;

export const VideoPlaybackResponseSchema = z.object({
  videoId: z.string(),
  provider: VideoProviderSchema,
  playbackUrl: z.string().url(),
  expiresAt: z.string().datetime().optional(),
  status: VideoStatusSchema,
  thumbnailUrl: OptionalUrlSchema,
});

export type VideoPlaybackResponse = z.infer<typeof VideoPlaybackResponseSchema>;
