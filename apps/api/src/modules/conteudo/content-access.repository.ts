import type { StrapiPublicationStatus } from '@pdc/shared';

export type GovernedContentRelation = 'curso' | 'experiencia' | 'programa' | 'simulacao';

export interface ContentVersions<T> {
  current?: T;
  published?: T;
}

export async function loadContentVersions<T>(
  loadVersion: (status: StrapiPublicationStatus) => Promise<T | undefined>,
): Promise<ContentVersions<T>> {
  const [current, published] = await Promise.all([
    loadVersion('draft'),
    loadVersion('published'),
  ]);

  return {
    ...(current === undefined ? {} : { current }),
    ...(published === undefined ? {} : { published }),
  };
}

export function appendContentEntityIdentityFilters(
  params: Record<string, string | string[]>,
  identifiers: readonly string[],
): void {
  let filterIndex = 0;
  for (const identifier of identifiers) {
    params[`filters[$or][${String(filterIndex)}][documentId][$eq]`] = identifier;
    filterIndex += 1;
    if (/^\d+$/.test(identifier)) {
      params[`filters[$or][${String(filterIndex)}][id][$eq]`] = identifier;
      filterIndex += 1;
    }
  }
}

export function contentRelationIdentityFilters(
  relation: GovernedContentRelation,
  identifier: string,
): Record<string, string> {
  return {
    [`filters[$or][0][${relation}][documentId][$eq]`]: identifier,
    ...(/^\d+$/.test(identifier)
      ? { [`filters[$or][1][${relation}][id][$eq]`]: identifier }
      : {}),
  };
}
