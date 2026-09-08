import { z } from 'zod';
import type { Role } from './enums.js';

export const VIDEO_QUICK_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
export const VIDEO_MULTIPART_PART_SIZE_BYTES = 10 * 1024 * 1024;
export const VIDEO_MULTIPART_MAX_PARTS = 10_000;

export const VIDEO_PROFESSIONAL_UPLOAD_MAX_BYTES_BY_ROLE = {
  mentor: 500 * 1024 * 1024,
  instituicao: 5 * 1024 * 1024 * 1024,
  super_admin: 20 * 1024 * 1024 * 1024,
} as const satisfies Partial<Record<Role, number>>;

export function professionalVideoUploadLimit(role: Role): number | undefined {
  switch (role) {
    case 'mentor':
      return VIDEO_PROFESSIONAL_UPLOAD_MAX_BYTES_BY_ROLE.mentor;
    case 'instituicao':
      return VIDEO_PROFESSIONAL_UPLOAD_MAX_BYTES_BY_ROLE.instituicao;
    case 'super_admin':
      return VIDEO_PROFESSIONAL_UPLOAD_MAX_BYTES_BY_ROLE.super_admin;
    default:
      return undefined;
  }
}

const OptionalUrlSchema = z.union([
  z.literal('').transform(() => undefined),
  z.string().url(),
  z.undefined(),
]);

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
}).superRefine((payload, context) => {
  if (payload.mode === 'quick_upload' && payload.sizeBytes > VIDEO_QUICK_UPLOAD_MAX_BYTES) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sizeBytes'],
      message: 'Upload rápido de vídeo limitado a 50MB.',
    });
  }
});

export type CreateR2VideoPayload = z.infer<typeof CreateR2VideoPayloadSchema>;

export const QuickR2VideoResponseSchema = z.object({
  video: VideoSchema.extend({
    provider: z.literal('r2'),
    mode: z.literal('quick_upload'),
  }),
  uploadUrl: z.string().url(),
  uploadMethod: z.enum(['presigned', 'direct']),
  key: z.string(),
});

export const ProfessionalR2VideoResponseSchema = z.object({
  video: VideoSchema.extend({
    provider: z.literal('r2'),
    mode: z.literal('professional_upload'),
  }),
  uploadMethod: z.literal('multipart'),
  key: z.string(),
  uploadId: z.string().min(1),
  partSizeBytes: z.number().int().min(5 * 1024 * 1024),
  totalParts: z.number().int().positive().max(VIDEO_MULTIPART_MAX_PARTS),
});

export const CreateR2VideoResponseSchema = z.discriminatedUnion('uploadMethod', [
  QuickR2VideoResponseSchema,
  ProfessionalR2VideoResponseSchema,
]);

export type CreateR2VideoResponse = z.infer<typeof CreateR2VideoResponseSchema>;

export const CreateVideoMultipartPartPayloadSchema = z.object({
  uploadId: z.string().min(1),
  partNumber: z.number().int().min(1).max(VIDEO_MULTIPART_MAX_PARTS),
});

export type CreateVideoMultipartPartPayload = z.infer<typeof CreateVideoMultipartPartPayloadSchema>;

export const VideoMultipartPartResponseSchema = z.object({
  uploadUrl: z.string().url(),
  partNumber: z.number().int().min(1).max(VIDEO_MULTIPART_MAX_PARTS),
});

export type VideoMultipartPartResponse = z.infer<typeof VideoMultipartPartResponseSchema>;

export const VideoMultipartCompletedPartSchema = z.object({
  partNumber: z.number().int().min(1).max(VIDEO_MULTIPART_MAX_PARTS),
  etag: z.string().min(1),
});

export const CompleteVideoMultipartUploadPayloadSchema = z.object({
  uploadId: z.string().min(1),
  parts: z.array(VideoMultipartCompletedPartSchema).min(1).max(VIDEO_MULTIPART_MAX_PARTS),
}).superRefine((payload, context) => {
  const seen = new Set<number>();
  payload.parts.forEach((part, index) => {
    if (seen.has(part.partNumber)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['parts', index, 'partNumber'],
        message: 'Cada parte deve aparecer apenas uma vez.',
      });
    }
    seen.add(part.partNumber);
  });
});

export type CompleteVideoMultipartUploadPayload = z.infer<typeof CompleteVideoMultipartUploadPayloadSchema>;

export const AbortVideoMultipartUploadPayloadSchema = z.object({
  uploadId: z.string().min(1),
});

export type AbortVideoMultipartUploadPayload = z.infer<typeof AbortVideoMultipartUploadPayloadSchema>;

export const VideoMultipartAbortResponseSchema = z.null();

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
