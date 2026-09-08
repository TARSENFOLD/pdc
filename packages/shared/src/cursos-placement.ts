export interface CourseModulePlacementItem {
  tipo?: string | null | undefined;
  ordem?: number | null | undefined;
}

export interface CourseModulePlacementResult {
  duplicateOrderIndexes: number[];
  videoIndexes: number[];
  misplacedVideoIndex?: number;
}

export function inspectCourseModulePlacement(
  items: readonly CourseModulePlacementItem[],
): CourseModulePlacementResult {
  const seenOrders = new Set<number>();
  const duplicateOrderIndexes: number[] = [];
  const validOrders: number[] = [];
  const videoIndexes: number[] = [];

  items.forEach((item, index) => {
    if (item.tipo === 'video') videoIndexes.push(index);
    if (typeof item.ordem !== 'number' || !Number.isInteger(item.ordem) || item.ordem < 0) return;
    if (seenOrders.has(item.ordem)) duplicateOrderIndexes.push(index);
    seenOrders.add(item.ordem);
    validOrders.push(item.ordem);
  });

  const videoIndex = videoIndexes[0];
  if (videoIndex === undefined || validOrders.length !== items.length) {
    return { duplicateOrderIndexes, videoIndexes };
  }

  const firstOrder = Math.min(...validOrders);
  const firstOrderIsUnique = validOrders.filter((order) => order === firstOrder).length === 1;
  const videoOrder = items[videoIndex]?.ordem;
  return {
    duplicateOrderIndexes,
    videoIndexes,
    ...((videoOrder !== firstOrder || !firstOrderIsUnique) ? { misplacedVideoIndex: videoIndex } : {}),
  };
}
