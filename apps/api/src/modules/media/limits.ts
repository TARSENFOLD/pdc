import { MEDIA_SIZE_LIMITS, type MediaEntityType } from '@pdc/shared';

export function getMediaSizeLimit(entityType: MediaEntityType): number {
  return MEDIA_SIZE_LIMITS[entityType];
}

export function formatBytes(bytes: number): string {
  const safeBytes = Number.isFinite(bytes) && bytes >= 0 ? bytes : 0;
  const megabytes = safeBytes / (1024 * 1024);
  const formatted = Number.isInteger(megabytes) ? megabytes.toFixed(0) : megabytes.toFixed(1);
  return `${formatted}MB`;
}
