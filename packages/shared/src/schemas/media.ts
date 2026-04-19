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
