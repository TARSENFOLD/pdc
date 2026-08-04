import { z } from 'zod';

import { EstadoEditorialSchema } from './schemas/enums.js';

/**
 * Compatibility contract used only until D-02 removes the legacy editorial
 * values and migrates every collection to the canonical state machine.
 */
export const PreMigrationContentStateSchema = z.union([
  EstadoEditorialSchema,
  z.literal('archived'),
]);
export type PreMigrationContentState = z.infer<typeof PreMigrationContentStateSchema>;

export const StrapiPublicationStatusSchema = z.enum(['draft', 'published']);
export type StrapiPublicationStatus = z.infer<typeof StrapiPublicationStatusSchema>;

export const ContentAccessPolicySchema = z.enum(['open', 'granted', 'restricted']);
export type ContentAccessPolicy = z.infer<typeof ContentAccessPolicySchema>;

export const ContentAccessErrorCodeSchema = z.enum([
  'CONTENT_NOT_FOUND',
  'PREVIEW_ONLY',
  'CONTENT_NOT_AVAILABLE',
  'DEPENDENCY_UNAVAILABLE',
]);
export type ContentAccessErrorCode = z.infer<typeof ContentAccessErrorCodeSchema>;

export const ContentAccessErrorResponseSchema = z.object({
  error: z.string().min(1),
  code: ContentAccessErrorCodeSchema,
});
export type ContentAccessErrorResponse = z.infer<typeof ContentAccessErrorResponseSchema>;
