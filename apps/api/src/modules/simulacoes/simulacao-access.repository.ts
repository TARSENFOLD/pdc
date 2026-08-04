import type { StrapiPublicationStatus } from '@pdc/shared';

import { loadContentVersions } from '../conteudo/content-access.repository.js';
import { strapiGet } from '../strapi/strapi.client.js';

export interface StrapiSimulacaoAccessRecord {
  id: string | number;
  documentId?: string;
  slug?: string;
  titulo: string;
  autorId: string;
  estado: string;
  tipo: number;
  area: string;
}

export async function findSimulacao(
  identifier: string,
  status?: StrapiPublicationStatus,
): Promise<StrapiSimulacaoAccessRecord | undefined> {
  const filters: Record<string, string> = {
    'filters[$or][0][slug][$eq]': identifier,
    'filters[$or][1][documentId][$eq]': identifier,
    'pagination[pageSize]': '1',
    ...(status === undefined ? {} : { status }),
  };
  if (/^\d+$/.test(identifier)) {
    filters['filters[$or][2][id][$eq]'] = identifier;
  }
  const response = await strapiGet<StrapiSimulacaoAccessRecord>('/simulacoes', filters);
  return response.data[0];
}

export async function loadSimulacaoVersions(identifier: string) {
  return loadContentVersions((status) => findSimulacao(identifier, status));
}
