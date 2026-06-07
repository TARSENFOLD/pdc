import { strapiGet } from './strapi.client.js';

export interface StrapiEntityReference {
  id: string | number;
  documentId?: string;
}

export function persistedEntityId(entity: StrapiEntityReference): string {
  return entity.documentId ?? String(entity.id);
}

export async function findStrapiEntity<T extends StrapiEntityReference>(
  collection: string,
  identifier: string,
  params: Record<string, string> = {},
): Promise<T | undefined> {
  const response = await strapiGet<T>(`/${collection}`, {
    ...params,
    'filters[$or][0][documentId][$eq]': identifier,
    'filters[$or][1][id][$eq]': identifier,
    'pagination[pageSize]': '1',
  });

  return response.data[0];
}
