import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import pino from 'pino';
import { AreaVocacionalSchema, EstadoEditorialSchema, ModalidadeSchema } from '@pdc/shared';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { withPublicCache } from '../middleware/cache.js';
import type { CursoPublico, SimulacaoPublica, ExperienciaPublica, CatalogoMeta } from '@pdc/shared';
import { catalogoExplorarRoutes } from './catalogo-explorar.js';
import { mentoresRoutes, instituicoesRoutes, perfilPublicoRoutes, pessoasRoutes } from './catalogo-pessoas.js';
import { type StrapiListResponse } from '../modules/strapi/strapi.types.js';

export const catalogoRoutes = new Hono();
const log = pino({ name: 'catalogo' });

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
  capaUrl?: string; area?: string; tipo: number;
  validadoAcademicamente?: boolean;
  estado?: 'draft' | 'review' | 'approved' | 'published' | 'rejected';
  tipoSimulacao?: 'tipo1' | 'tipo2' | 'tipo3';
  autorId?: string;
  criteriosAvaliacao?: { pesos: { fluidez: number; resiliencia: number; foco: number } };
  rating?: number;
  tentativasMaximas?: number;
}

interface StrapiExperiencia {
  id: string | number; slug: string; titulo: string; descricao: string;
  capaUrl?: string; area?: string; nivel?: string;
  instituicaoNome?: string; dataInicio?: string; gratuito?: boolean;
  validadoAcademicamente?: boolean;
  estado?: 'draft' | 'review' | 'approved' | 'published' | 'rejected';
  modalidade?: string;
}

const NivelSchema = z.enum(['basico', 'medio', 'avancado']);
const SimulacaoTipoSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgQ = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
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

function parseOptional<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
  const parsed = schema.optional().safeParse(value);
  return parsed.success ? parsed.data : undefined;
}


function mapCurso(d: StrapiCurso): CursoPublico {
  return {
    id: sid(d.id), slug: d.slug, titulo: d.titulo, descricao: d.descricao,
    capaUrl: d.capaUrl, area: parseOptional(AreaVocacionalSchema, d.area), nivel: parseOptional(NivelSchema, d.nivel), idioma: d.idioma,
    gratuito: d.gratuito, totalHoras: d.totalHoras ?? 0, autorNome: d.autorNome,
  };
}
function mapSim(d: StrapiSimulacao): SimulacaoPublica {
  return {
    id: sid(d.id), 
    slug: d.slug || sid(d.id), 
    titulo: d.titulo, 
    descricao: d.descricao,
    capaUrl: d.capaUrl, 
    area: parseOptional(AreaVocacionalSchema, d.area) ?? 'OUTRA',
    tipo: parseOptional(SimulacaoTipoSchema, d.tipo) ?? 1,
    validadoAcademicamente: d.validadoAcademicamente ?? false,
    estado: parseOptional(EstadoEditorialSchema, d.estado) ?? 'published',
    tipoSimulacao: d.tipoSimulacao || 'tipo1',
    autorId: d.autorId || '',
    criteriosAvaliacao: d.criteriosAvaliacao || { pesos: { fluidez: 40, resiliencia: 30, foco: 30 } },
    rating: d.rating ?? 0,
    tentativasMaximas: d.tentativasMaximas ?? 0,
  };
}
function mapExp(d: StrapiExperiencia): ExperienciaPublica {
  return {
    id: sid(d.id), 
    slug: d.slug, 
    titulo: d.titulo, 
    descricao: d.descricao,
    capaUrl: d.capaUrl, 
    area: parseOptional(AreaVocacionalSchema, d.area),
    nivel: parseOptional(NivelSchema, d.nivel),
    instituicao: d.instituicaoNome ? { id: '', nome: d.instituicaoNome } : undefined, 
    dataInicio: d.dataInicio,
    gratuito: true,
    validadoAcademicamente: d.validadoAcademicamente ?? false,
    estado: parseOptional(EstadoEditorialSchema, d.estado) ?? 'published',
    modalidade: parseOptional(ModalidadeSchema, d.modalidade),
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
  addPg(p, q.page, q.pageSize ?? q.limit);
  if (q.area) p['filters[area][$eq]'] = q.area;
  if (q.nivel) p['filters[nivel][$eq]'] = q.nivel;
  if (q.idioma) p['filters[idioma][$eq]'] = q.idioma;
  if (q.gratuito !== undefined) p['filters[gratuito][$eq]'] = String(q.gratuito);
  
  try {
    const res = await strapiGet<StrapiCurso>('/cursos', p);
    return c.json({ data: res.data.map(mapCurso), meta: toMeta(res.meta) });
  } catch (err) {
    log.error({ err, params: p }, 'Failed to fetch cursos catalog');
    return c.json({ error: 'Falha ao carregar catálogo de cursos' }, 502);
  }
});

catalogoRoutes.get('/cursos/:slug', async (c) => {
  const slug = c.req.param('slug');
  const p: Record<string, string> = { 
    'filters[slug][$eq]': slug,
    'filters[estado][$eq]': 'published'
  }; 
  try {
    const res = await strapiGet<StrapiCurso>('/cursos', p);
    const first = res.data[0];
    if (!first) return c.json({ error: 'Curso não encontrado' }, 404);
    return c.json({ data: mapCurso(first) });
  } catch (err) {
    log.error({ err, slug, params: p }, 'Failed to fetch curso detail');
    return c.json({ error: 'Falha ao carregar curso' }, 502);
  }
});

// ─── Simulações ───────────────────────────────────────────────────────────────

const simQ = pgQ.extend({
  sort: z.string().optional(),
  area: AreaVocacionalSchema.optional(), tipo: z.coerce.number().int().min(1).max(3).optional(),
  nivel: z.string().optional(),
});

const SIM_ALLOWED_SORTS = new Set(['createdAt:desc', 'createdAt:asc', 'updatedAt:desc', 'updatedAt:asc', 'rating:desc', 'rating:asc']);

catalogoRoutes.get('/simulacoes', zValidator('query', simQ), async (c) => {
  const q = c.req.valid('query');
  const p: Record<string, string> = { 'filters[estado][$eq]': 'published' }; 
  addPg(p, q.page, q.pageSize ?? q.limit);
  if (q.area) p['filters[area][$eq]'] = q.area;
  if (q.tipo !== undefined) p['filters[tipo][$eq]'] = q.tipo.toString();
  if (q.nivel) p['filters[nivel][$eq]'] = q.nivel;
  if (q.sort && SIM_ALLOWED_SORTS.has(q.sort)) {
    p['sort'] = q.sort;
  } else {
    p['sort'] = 'createdAt:desc';
  }
  
  try {
    const res = await strapiGet<StrapiSimulacao>('/simulacoes', p);
    return c.json({ data: res.data.map(mapSim), meta: toMeta(res.meta) });
  } catch (err) {
    log.error({ err, params: p }, 'Failed to fetch simulacoes catalog');
    return c.json({ error: 'Falha ao carregar catálogo de simulações' }, 502);
  }
});

catalogoRoutes.get('/simulacoes/:slug', async (c) => {
  const slug = c.req.param('slug');
  const p: Record<string, string> = { 
    'filters[slug][$eq]': slug,
    'filters[estado][$eq]': 'published'
  }; 
  try {
    const res = await strapiGet<StrapiSimulacao>('/simulacoes', p);
    const first = res.data[0];
    if (!first) return c.json({ error: 'Simulação não encontrada' }, 404);
    return c.json({ data: mapSim(first) });
  } catch (err) {
    log.error({ err, slug, params: p }, 'Failed to fetch simulacao detail');
    return c.json({ error: 'Falha ao carregar simulação' }, 502);
  }
});

// ─── Experiências ─────────────────────────────────────────────────────────────

const expQ = pgQ.extend({ area: AreaVocacionalSchema.optional(), nivel: z.string().optional() });

catalogoRoutes.get('/experiencias', zValidator('query', expQ), async (c) => {
  const q = c.req.valid('query');
  const p: Record<string, string> = { 'filters[estado][$eq]': 'published' }; 
  addPg(p, q.page, q.pageSize ?? q.limit);
  if (q.area) p['filters[area][$eq]'] = q.area;
  if (q.nivel) p['filters[nivel][$eq]'] = q.nivel;
  
  try {
    const res = await strapiGet<StrapiExperiencia>('/experiencias', p);
    return c.json({ data: res.data.map(mapExp), meta: toMeta(res.meta) });
  } catch (err) {
    log.error({ err, params: p }, 'Failed to fetch experiencias catalog');
    return c.json({ error: 'Falha ao carregar catálogo de experiências' }, 502);
  }
});

// ─── Sub-routers ──────────────────────────────────────────────────────────────

catalogoRoutes.route('/mentores', mentoresRoutes);
catalogoRoutes.route('/instituicoes', instituicoesRoutes);
catalogoRoutes.route('/pessoas', pessoasRoutes);
catalogoRoutes.route('/perfil', perfilPublicoRoutes);
catalogoRoutes.route('/explorar', catalogoExplorarRoutes);
