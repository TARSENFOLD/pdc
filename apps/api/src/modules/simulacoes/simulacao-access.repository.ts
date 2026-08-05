import {
  PreMigrationContentStateSchema,
  type PreMigrationContentState,
  type StrapiPublicationStatus,
} from '@pdc/shared';
import { z } from 'zod';

import { loadContentVersions } from '../conteudo/content-access.repository.js';
import { strapiGet } from '../strapi/strapi.client.js';

export interface StrapiSimulacaoAccessRecord {
  id: string | number;
  documentId?: string;
  slug?: string;
  titulo: string;
  autorId: string;
  estado: PreMigrationContentState;
  tipo: number;
  area: string;
}

const StrapiSimulacaoAccessRecordSchema = z.object({
  id: z.union([z.string().min(1), z.number().int()]),
  documentId: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  titulo: z.string().min(1),
  autorId: z.string().min(1),
  estado: PreMigrationContentStateSchema,
  tipo: z.number().int(),
  area: z.string().min(1),
}).passthrough();

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
  const record = response.data[0];
  if (record === undefined) return undefined;
  const parsed = StrapiSimulacaoAccessRecordSchema.parse(record);
  return {
    id: parsed.id,
    ...(parsed.documentId === undefined ? {} : { documentId: parsed.documentId }),
    ...(parsed.slug === undefined ? {} : { slug: parsed.slug }),
    titulo: parsed.titulo,
    autorId: parsed.autorId,
    estado: parsed.estado,
    tipo: parsed.tipo,
    area: parsed.area,
  };
}

export async function loadSimulacaoVersions(identifier: string) {
  return loadContentVersions((status) => findSimulacao(identifier, status));
}
