import { z } from 'zod';

export const ColdStorageLayerSchema = z.enum(['edge', 'bff']);

export const ColdStorageEventSchema = z.object({
  eventId: z.string(),
  tipo: z.string(),
  payload: z.unknown(),
  timestamp: z.string(),
  invalidReason: z.string(),
  layer: ColdStorageLayerSchema,
  archivedAt: z.string(),
});

export type ColdStorageEvent = z.infer<typeof ColdStorageEventSchema>;
export type ColdStorageLayer = z.infer<typeof ColdStorageLayerSchema>;
