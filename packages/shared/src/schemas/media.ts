import { z } from 'zod';

export const UploadResultSchema = z.object({
  id: z.string(),
  url: z.string(),
  key: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  thumbnailUrl: z.string().optional(),
});

export type UploadResult = z.infer<typeof UploadResultSchema>;

export const MediaEntityTypeSchema = z.enum([
  'avatar',
  'capa',
  'projeto',
  'curso-capa',
  'post-media',
  'generic',
  'onboarding-video',
]);

export type MediaEntityType = z.infer<typeof MediaEntityTypeSchema>;

// Canonical size limits by entity type (bytes)
export const MEDIA_SIZE_LIMITS: Record<MediaEntityType, number> = {
  avatar: 2 * 1024 * 1024,              // 2 MB
  capa: 5 * 1024 * 1024,               // 5 MB
  projeto: 50 * 1024 * 1024,           // 50 MB
  'curso-capa': 5 * 1024 * 1024,       // 5 MB
  'post-media': 50 * 1024 * 1024,      // 50 MB
  generic: 50 * 1024 * 1024,           // 50 MB
  'onboarding-video': 50 * 1024 * 1024, // 50 MB
};

// Canonical aspect ratios by entity type (width/height)
export const MEDIA_ASPECT_RATIOS: Record<Exclude<MediaEntityType, 'generic'>, number | null> = {
  avatar: 1,             // 1:1
  capa: 3,               // 3:1
  projeto: 4 / 3,        // 4:3
  'curso-capa': 16 / 9,  // 16:9
  'post-media': null,    // free
  'onboarding-video': 16 / 9, // 16:9
};

export const PresignedRequestSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  entityType: MediaEntityTypeSchema.default('generic'),
});

export type PresignedRequest = z.infer<typeof PresignedRequestSchema>;

export const PresignedResponseSchema = z.object({
  uploadUrl: z.string().url(),
  publicUrl: z.string().url(),
  mediaId: z.string(),
  key: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
});

export type PresignedResponse = z.infer<typeof PresignedResponseSchema>;

export const MediaFinalizedPayloadSchema = z.object({
  mediaId: z.string(),
  key: z.string(),
  publicUrl: z.string().url(),
  entityType: MediaEntityTypeSchema.optional(),
  entityId: z.string().optional(),
});

export type MediaFinalizedPayload = z.infer<typeof MediaFinalizedPayloadSchema>;

export const CropParamsSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
  unit: z.enum(['px', '%']).default('px'),
});

export type CropParams = z.infer<typeof CropParamsSchema>;

// Flat response from BFF POST /media/presigned
export const PresignedMediaResponseSchema = z.object({
  uploadUrl: z.string().url(),
  publicUrl: z.string().url(),
  mediaId: z.string(),
  key: z.string(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().optional(),
});

export type PresignedMediaResponse = z.infer<typeof PresignedMediaResponseSchema>;
