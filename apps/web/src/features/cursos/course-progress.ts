import type { ProgressoItem } from '@pdc/shared';
import { ApiError } from '@/lib/api/http';

export function countCurrentCompletedItems(
  itemIds: readonly string[],
  progresso: readonly ProgressoItem[],
): number {
  const currentIds = new Set(itemIds);
  const completedIds = new Set(
    progresso.filter((entry) => entry.concluido).map((entry) => entry.itemId),
  );
  return [...currentIds].filter((itemId) => completedIds.has(itemId)).length;
}

export function isEnrollmentRequiredError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 403 || error.status === 404);
}
