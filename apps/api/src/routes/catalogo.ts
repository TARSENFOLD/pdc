import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AreaVocacionalSchema } from '@pdc/shared';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { withPublicCache } from '../middleware/cache.js';
import type { CursoPublico, SimulacaoPublica, ExperienciaPublica, CatalogoMeta, AreaVocacional } from '@pdc/shared';
import { catalogoExplorarRoutes } from './catalogo-explorar.js';
import { mentoresRoutes, instituicoesRoutes, perfilPublicoRoutes } from './catalogo-pessoas.js';
import { type StrapiListResponse } from '../modules/strapi/strapi.types.js';

export const catalogoRoutes = new Hono();

// Public catalogue endpoints get stale-while-revalidate caching
catalogoRoutes.use('*', withPublicCache(60, 300));

// ─── Strapi shapes (Flat v5) ──────────────────────────────────────────────────

interface StrapiCurso {
  id: string | number; slug: string; titulo: string; descricao: string;
  capaUrl?: string; area?: string; nivel?: string; idioma?: string;
  gratuito?: boolean; totalHoras?: number; autorNome?: string;
}

interface StrapiSimulacao {
  id: string | number; slug?: string; titulo: string; descricao: string;
  capaUrl?: string; area?: string; tipo: number; nivel?: string;
}

interface StrapiExperiencia {
  id: string | number; slug: string; titulo: string; descricao: string;
  capaUrl?: string; area?: string; nivel?: string;
  instituicaoNome?: string; dataInicio?: string; gratuito?: boolean;
}

const NivelSchema = z.enum(['basico', 'medio', 'avancado']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgQ = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
});

function sid(v: string | number): string { return typeof v === 'number' ? v.toString() : v; }

function toMeta(meta: StrapiListResponse<unknown>['meta']): CatalogoMeta {
  const p = meta.pagination;
  return { page: p.page, pageSize: p.pageSize, total: p.total, pageCount: p.pageCount };
}

function addPg(p: Record<string, string>, page: number, limit: number): void {
  p['pagination[page]'] = page.toString();
  p['pagination[pageSize]'] = limit.toString();
}


function mapCurso(d: StrapiCurso): CursoPublico {
  return {
    id: sid(d.id), slug: d.slug, titulo: d.titulo, descricao: d.descricao,
    capaUrl: d.capaUrl, area: d.area as AreaVocacional, nivel: d.nivel as 'basico' | 'medio' | 'avancado' | undefined, idioma: d.idioma,
    gratuito: d.gratuito, totalHoras: d.totalHoras ?? 0, autorNome: d.autorNome,
  };
}
function mapSim(d: StrapiSimulacao): SimulacaoPublica {
  return {
    id: sid(d.id), slug: d.slug || sid(d.id), titulo: d.titulo, descricao: d.descricao,
    capaUrl: d.capaUrl, area: d.area as AreaVocacional, tipo: d.tipo as 1 | 2 | 3, nivel: d.nivel,
  };
}
function mapExp(d: StrapiExperiencia): ExperienciaPublica {
  return {
    id: sid(d.id), slug: d.slug, titulo: d.titulo, descricao: d.descricao,
    capaUrl: d.capaUrl, 
    area: AreaVocacionalSchema.optional().safeParse(d.area).data, 
    nivel: NivelSchema.optional().safeParse(d.nivel).data,
    instituicao: d.instituicaoNome ? { id: '', nome: d.instituicaoNome } : undefined, dataInicio: d.dataInicio,
    gratuito: (d.gratuito ?? true) as true,
  };
}

// ─── Cursos ───────────────────────────────────────────────────────────────────

const cursoQ = pgQ.extend({
  area: AreaVocacionalSchema.optional(), nivel: z.string().optional(),
  idioma: z.string().optional(), gratuito: z.coerce.boolean().optional(),
});

catalogoRoutes.get('/cursos', zValidator('query', cursoQ), async (c) => {
  const q = c.req.valid('query');
  const p: Record<string, string> = { 'filters[estado][$eq]': 'published' }; 
  addPg(p, q.page, q.limit);
  if (q.area) p['filters[area][$eq]'] = q.area;
  if (q.nivel) p['filters[nivel][$eq]'] = q.nivel;
  if (q.idioma) p['filters[idioma][$eq]'] = q.idioma;
  if (q.gratuito !== undefined) p['filters[gratuito][$eq]'] = String(q.gratuito);
  
  const res = await strapiGet<StrapiCurso>('/cursos', p);
  return c.json({ data: res.data.map(mapCurso), meta: toMeta(res.meta) });
});

catalogoRoutes.get('/cursos/:slug', async (c) => {
  const slug = c.req.param('slug');
  const p: Record<string, string> = { 
    'filters[slug][$eq]': slug,
    'filters[estado][$eq]': 'published'
  }; 
  const res = await strapiGet<StrapiCurso>('/cursos', p);
  const first = res.data[0];
  if (!first) return c.json({ error: 'Curso não encontrado' }, 404);
  return c.json({ data: mapCurso(first) });
});

// ─── Simulações ───────────────────────────────────────────────────────────────

const simQ = pgQ.extend({
  sort: z.string().optional(),
  area: AreaVocacionalSchema.optional(), tipo: z.coerce.number().int().min(1).max(3).optional(),
  nivel: z.string().optional(),
});

catalogoRoutes.get('/simulacoes', zValidator('query', simQ), async (c) => {
  const q = c.req.valid('query');
  const p: Record<string, string> = { 'filters[estado][$eq]': 'published' }; 
  addPg(p, q.page, q.limit);
  if (q.area) p['filters[area][$eq]'] = q.area;
  if (q.tipo !== undefined) p['filters[tipo][$eq]'] = q.tipo.toString();
  if (q.nivel) p['filters[nivel][$eq]'] = q.nivel;
  if (q.sort) p['sort'] = q.sort;
  
  const res = await strapiGet<StrapiSimulacao>('/simulacoes', p);
  return c.json({ data: res.data.map(mapSim), meta: toMeta(res.meta) });
});

catalogoRoutes.get('/simulacoes/:slug', async (c) => {
  const slug = c.req.param('slug');
  const p: Record<string, string> = { 
    'filters[slug][$eq]': slug,
    'filters[estado][$eq]': 'published'
  }; 
  const res = await strapiGet<StrapiSimulacao>('/simulacoes', p);
  const first = res.data[0];
  if (!first) return c.json({ error: 'Simulação não encontrada' }, 404);
  return c.json({ data: mapSim(first) });
});

// ─── Experiências ─────────────────────────────────────────────────────────────

const expQ = pgQ.extend({ area: AreaVocacionalSchema.optional(), nivel: z.string().optional() });

catalogoRoutes.get('/experiencias', zValidator('query', expQ), async (c) => {
  const q = c.req.valid('query');
  const p: Record<string, string> = { 'filters[estado][$eq]': 'published' }; 
  addPg(p, q.page, q.limit);
  if (q.area) p['filters[area][$eq]'] = q.area;
  if (q.nivel) p['filters[nivel][$eq]'] = q.nivel;
  
  const res = await strapiGet<StrapiExperiencia>('/experiencias', p);
  return c.json({ data: res.data.map(mapExp), meta: toMeta(res.meta) });
});

// ─── Sub-routers ──────────────────────────────────────────────────────────────

catalogoRoutes.route('/mentores', mentoresRoutes);
catalogoRoutes.route('/instituicoes', instituicoesRoutes);
catalogoRoutes.route('/perfil', perfilPublicoRoutes);
catalogoRoutes.route('/explorar', catalogoExplorarRoutes);
catalogoRoutes.route('/explorar', catalogoExplorarRoutes);
