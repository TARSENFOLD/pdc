import { LegalDocumentPublicSchema, type LegalDocumentPublic } from '@pdc/shared';
import { strapiGet } from '../strapi/strapi.client.js';

interface StrapiDocumentoLegal {
  id: string | number;
  slug: string;
  tipo: string;
  titulo: string;
  versao: string;
  resumo?: string;
  conteudo: string;
  effectiveAt?: string;
  updatedAt?: string;
}

async function findPublishedBySlug(slug: string): Promise<LegalDocumentPublic | null> {
  const res = await strapiGet<StrapiDocumentoLegal>('/documentos-legais', {
    'filters[slug][$eq]': slug,
    'filters[estado][$eq]': 'published',
    'pagination[pageSize]': '1',
    sort: 'effectiveAt:desc',
  });
  const document = res.data[0];
  if (!document) return null;
  return LegalDocumentPublicSchema.parse(document);
}

export const legalService = {
  findPublishedBySlug,
};
