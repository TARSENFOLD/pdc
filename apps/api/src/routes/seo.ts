import { Hono } from 'hono';
import pino from 'pino';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { redis } from '../lib/redis.js';
import { env } from '../lib/env.js';

const log = pino({ name: 'seo-routes' });

export const seoRoutes = new Hono();

const BASE_URL = 'https://usepdc.com';
const OG_DEFAULT = `${BASE_URL}/og-default.png`;

// ─── Observability counters ───────────────────────────────────────────────────

const counters = {
  sitemapFallback: 0,
  strapiTimeout: 0,
  botRender: 0,
};

const SEO_BOT_RENDER_ENABLED = () => env.SEO_BOT_RENDER_ENABLED === 'true';

// ─── Strapi flat data shapes (consistent with v5 normalization) ───────────────

interface StrapiItem {
  id: string | number;
  slug?: string;
  titulo?: string;
  descricao?: string;
  nome?: string;
  bio?: string;
  capaUrl?: string;
  avatarUrl?: string;
  logoUrl?: string;
  areaEspecialidade?: string;
  updatedAt?: string;
}

// ─── Static fallback URLs ─────────────────────────────────────────────────────

const STATIC_URLS = [
  '/', '/cursos', '/simulacoes', '/experiencias',
  '/mentores', '/instituicoes', '/explorar', '/projetos',
];

function buildStaticSitemap(): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  STATIC_URLS.forEach(path => {
    xml += `  <url><loc>${BASE_URL}${path}</loc></url>\n`;
  });
  xml += '</urlset>';
  return xml;
}

// ─── GET /sitemap.xml ─────────────────────────────────────────────────────────

seoRoutes.get('/sitemap.xml', async (c) => {
  try {
    const [cursos, simulacoes, experiencias, mentores, instituicoes] = await Promise.all([
      strapiGet<StrapiItem>('/cursos', { 'filters[estado][$eq]': 'published', 'pagination[pageSize]': '1000' }),
      strapiGet<StrapiItem>('/simulacoes', { 'filters[estado][$eq]': 'published', 'pagination[pageSize]': '1000' }),
      strapiGet<StrapiItem>('/experiencias', { 'filters[estado][$eq]': 'published', 'pagination[pageSize]': '1000' }),
      strapiGet<StrapiItem>('/mentores', { 'pagination[pageSize]': '1000' }).catch(() => ({ data: [], meta: { pagination: { page: 1, pageSize: 1000, pageCount: 0, total: 0 } } })),
      strapiGet<StrapiItem>('/instituicoes', { 'pagination[pageSize]': '1000' }).catch(() => ({ data: [], meta: { pagination: { page: 1, pageSize: 1000, pageCount: 0, total: 0 } } })),
    ]);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    STATIC_URLS.forEach(path => {
      xml += `  <url><loc>${BASE_URL}${path}</loc></url>\n`;
    });

    cursos.data.forEach(item => {
      const slug = item.slug ?? String(item.id);
      const lastmod = item.updatedAt ? item.updatedAt.split('T')[0] : undefined;
      xml += `  <url><loc>${BASE_URL}/cursos/${slug}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>\n`;
    });

    simulacoes.data.forEach(item => {
      const slug = item.slug ?? String(item.id);
      const lastmod = item.updatedAt ? item.updatedAt.split('T')[0] : undefined;
      xml += `  <url><loc>${BASE_URL}/simulacoes/${slug}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>\n`;
    });

    experiencias.data.forEach(item => {
      const lastmod = item.updatedAt ? item.updatedAt.split('T')[0] : undefined;
      xml += `  <url><loc>${BASE_URL}/experiencias/${String(item.id)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>\n`;
    });

    mentores.data.forEach(item => {
      xml += `  <url><loc>${BASE_URL}/mentores/${String(item.id)}</loc></url>\n`;
    });

    instituicoes.data.forEach(item => {
      const slug = item.slug ?? String(item.id);
      xml += `  <url><loc>${BASE_URL}/instituicoes/${slug}</loc></url>\n`;
    });

    xml += '</urlset>';
    return c.newResponse(xml, 200, { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' });
  } catch (err) {
    counters.sitemapFallback++;
    counters.strapiTimeout++;
    log.warn({ err }, '[seo] Sitemap fallback — Strapi indisponível');
    const xml = buildStaticSitemap();
    return c.newResponse(xml, 200, { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=300' });
  }
});

// ─── GET /robots.txt ──────────────────────────────────────────────────────────

seoRoutes.get('/robots.txt', (c) => {
  const robots = `User-agent: *
Disallow: /app/
Disallow: /api/
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml`;
  return c.text(robots);
});

// ─── GET /health ──────────────────────────────────────────────────────────────

seoRoutes.get('/health', async (c) => {
  let dbOk = false;
  let redisOk = false;

  try {
    await strapiGet('/users', { 'pagination[pageSize]': '1' });
    dbOk = true;
  } catch {
    counters.strapiTimeout++;
  }

  try {
    await redis.ping();
    redisOk = true;
  } catch { /* redis down */ }

  return c.json({
    status: 'ok',
    db: dbOk,
    redis: redisOk,
    timestamp: new Date().toISOString(),
  });
});

// ─── GET /meta — Server-side OG meta for social bots ──────────────────────────

seoRoutes.get('/meta', async (c) => {
  if (!SEO_BOT_RENDER_ENABLED()) {
    return c.text('Bot rendering disabled', 503);
  }

  const path = c.req.query('path') ?? '/';
  counters.botRender++;

  let title = 'PDC — Por Dentro do Curso';
  let description = 'Experimenta profissões e cursos através de simulações práticas antes de te matriculares.';
  let image = OG_DEFAULT;
  let ogType = 'website';
  let jsonLd = '';

  try {
    const cursoMatch = path.match(/^\/cursos\/(.+)$/);
    const simMatch = path.match(/^\/simulacoes\/(.+)$/);
    const mentorMatch = path.match(/^\/mentores\/(.+)$/);
    const instMatch = path.match(/^\/instituicoes\/(.+)$/);
    const expMatch = path.match(/^\/experiencias\/(.+)$/);
    const projetoMatch = path.match(/^\/projetos\/(.+)$/);

    if (cursoMatch) {
      const slug = cursoMatch[1] ?? '';
      const res = await strapiGet<StrapiItem>('/cursos', { 'filters[slug][$eq]': slug, 'pagination[pageSize]': '1' }).catch(() => null);
      const curso = res?.data[0];
      if (curso) {
        title = curso.titulo ?? title;
        description = curso.descricao ?? description;
        image = curso.capaUrl || OG_DEFAULT;
        ogType = 'article';
        jsonLd = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Course',
          name: title,
          description,
          provider: { '@type': 'Organization', name: 'PDC — Por Dentro do Curso' },
          url: `${BASE_URL}/cursos/${slug}`,
        });
      }
    } else if (simMatch) {
      const slug = simMatch[1] ?? '';
      const res = await strapiGet<StrapiItem>('/simulacoes', { 'filters[slug][$eq]': slug, 'pagination[pageSize]': '1' }).catch(() => null);
      const sim = res?.data[0];
      if (sim) {
        title = sim.titulo ?? title;
        description = sim.descricao ?? description;
        image = sim.capaUrl || OG_DEFAULT;
        ogType = 'article';
      }
    } else if (mentorMatch) {
      const id = mentorMatch[1] ?? '';
      const res = await strapiGet<StrapiItem>(`/users/${id}`).catch(() => null);
      const mentor = res?.data[0];
      if (mentor) {
        title = mentor.nome ?? title;
        description = mentor.bio ?? description;
        image = mentor.avatarUrl || OG_DEFAULT;
        ogType = 'profile';
        jsonLd = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: title,
          description,
          jobTitle: mentor.areaEspecialidade,
          url: `${BASE_URL}/mentores/${id}`,
        });
      }
    } else if (instMatch) {
      const slug = instMatch[1] ?? '';
      const res = await strapiGet<StrapiItem>('/instituicoes', { 'filters[slug][$eq]': slug, 'pagination[pageSize]': '1' }).catch(() => null);
      const inst = res?.data[0];
      if (inst) {
        title = inst.nome ?? title;
        description = inst.descricao ?? description;
        image = inst.logoUrl || OG_DEFAULT;
        ogType = 'profile';
        jsonLd = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'EducationalOrganization',
          name: title,
          description,
          url: `${BASE_URL}/instituicoes/${slug}`,
        });
      }
    } else if (expMatch) {
      const id = expMatch[1] ?? '';
      const res = await strapiGet<StrapiItem>(`/experiencias/${id}`).catch(() => null);
      const exp = res?.data[0];
      if (exp) {
        title = exp.titulo ?? title;
        description = exp.descricao ?? description;
        image = exp.capaUrl || OG_DEFAULT;
        ogType = 'article';
      }
    } else if (projetoMatch) {
      ogType = 'article';
    }
  } catch (err) {
    counters.strapiTimeout++;
    log.warn({ err }, '[seo] Bot meta fetch failed');
  }

  const canonical = `${BASE_URL}${path}`;
  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} | PDC — Por Dentro do Curso</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="PDC — Por Dentro do Curso">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  ${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}
</head>
<body></body>
</html>`;

  return c.html(html);
});

// ─── GET /stats — observability counters ──────────────────────────────────────

seoRoutes.get('/stats', (c) => {
  return c.json(counters);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
