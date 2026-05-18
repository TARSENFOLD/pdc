import { Hono } from 'hono';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { type StrapiListResponse } from '@pdc/shared';
import { applyPublicCatalogStateFilter } from './publication-state.js';

export const seoRoutes = new Hono();

const BASE_URL = 'https://pdc.ao';

interface StrapiItemAttributes {
  id: number;
  slug?: string;
  updatedAt?: string;
}

const STATIC_URLS = [
  '/',
  '/explorar',
  '/sobre',
  '/contacto'
];

seoRoutes.get('/sitemap.xml', async (c) => {
  try {
    const cursosParams: Record<string, string | string[]> = { 'pagination[pageSize]': '1000' };
    const simulacoesParams: Record<string, string | string[]> = { 'pagination[pageSize]': '1000' };
    const experienciasParams: Record<string, string | string[]> = { 'pagination[pageSize]': '1000' };
    applyPublicCatalogStateFilter(cursosParams);
    applyPublicCatalogStateFilter(simulacoesParams);
    applyPublicCatalogStateFilter(experienciasParams);

    const [cursos, simulacoes, experiencias] = await Promise.all([
      strapiGet<StrapiItemAttributes>('/cursos', cursosParams),
      strapiGet<StrapiItemAttributes>('/simulacoes', simulacoesParams),
      strapiGet<StrapiItemAttributes>('/experiencias', experienciasParams),
    ]);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    STATIC_URLS.forEach(path => {
      xml += `  <url><loc>${BASE_URL}${path}</loc></url>\n`;
    });

    const processItems = (items: StrapiListResponse<StrapiItemAttributes>, path: string) => {
      items.data.forEach(item => {
        const slug = item.slug ?? String(item.id);
        const lastmod = item.updatedAt ? item.updatedAt.split('T')[0] : '';
        xml += `  <url><loc>${BASE_URL}/${path}/${slug}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>\n`;
      });
    };
    
    processItems(cursos, 'cursos');
    processItems(simulacoes, 'simulacoes');
    processItems(experiencias, 'experiencias');

    xml += '</urlset>';
    return c.newResponse(xml, 200, { 
      'Content-Type': 'application/xml', 
      'Cache-Control': 'public, max-age=3600' 
    });

  } catch {
    return c.text('Error generating sitemap', 500);
  }
});
