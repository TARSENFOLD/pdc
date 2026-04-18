import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AreaVocacionalSchema } from '@pdc/shared';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import * as featureFlagService from '../modules/feature-flags/feature-flags.service.js';
import { serializePublicProfile, type StrapiPerfil } from '../modules/perfil/perfil.serializer.js';
import type {
  MentorPublico,
  InstituicaoPublica,
  PerfilPublicoBasico,
  CatalogoMeta,
  Role,
} from '@pdc/shared';

// ─── Strapi shapes ───────────────────────────────────────────────────────────

interface StrapiPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

interface StrapiList<T> {
  data: T[];
  meta: { pagination: StrapiPagination };
}

interface StrapiMentor {
  id: string | number;
  nome?: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  areaEspecialidade?: string;
  disponivel?: boolean;
}

interface StrapiInstituicao {
  id: string | number;
  slug?: string;
  nome: string;
  descricao?: string;
  logoUrl?: string;
  tipo?: string;
  regiao?: string;
}

interface StrapiUserPublic {
  id: string | number;
  nome?: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  role?: { name: string };
}

interface StrapiPerfilPublic {
  id: string | number;
  nome?: string;
  tipo?: string;
  bio?: string;
  headline?: string;
  telefone?: string;
  website?: string;
  socialLinks?: unknown;
  areasInteresse?: unknown;
  competencias?: unknown;
  avatarUrl?: string;
  foto?: { url?: string } | null;
  visibilitySettings?: Record<string, string> | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
});

function sid(val: string | number): string {
  return typeof val === 'number' ? val.toString() : val;
}

function toMeta(p: StrapiPagination): CatalogoMeta {
  return { page: p.page, pageSize: p.pageSize, total: p.total, pageCount: p.pageCount };
}

function buildPagination(p: Record<string, string>, page: number, limit: number): void {
  p['pagination[page]'] = page.toString();
  p['pagination[pageSize]'] = limit.toString();
}

function publishedFilter(p: Record<string, string>): void {
  p['filters[estado][$eq]'] = 'published';
  p['filters[visibilidade][$eq]'] = 'publico';
}

// ─── Mentores ─────────────────────────────────────────────────────────────────

export const mentoresRoutes = new Hono();

const mentorFilters = paginationQuery.extend({
  area: AreaVocacionalSchema.optional(),
  disponivel: z.coerce.boolean().optional(),
});

function mapMentor(d: StrapiMentor): MentorPublico {
  return {
    id: sid(d.id), 
    nome: d.nome ?? d.username ?? '',
    especialidade: d.areaEspecialidade || 'Especialista',
    avatarUrl: d.avatarUrl, 
    bio: d.bio,
    areaEspecialidade: d.areaEspecialidade, 
    disponivel: d.disponivel,
  };
}

mentoresRoutes.get('/', zValidator('query', mentorFilters), async (c) => {
  const q = c.req.valid('query');
  const p: Record<string, string> = { populate: 'avatar' };
  buildPagination(p, q.page, q.limit);
  p['filters[role][name][$eq]'] = 'mentor';
  p['filters[aprovado][$eq]'] = 'true';
  if (q.area) p['filters[areaEspecialidade][$eq]'] = q.area;
  if (q.disponivel !== undefined) p['filters[disponivel][$eq]'] = String(q.disponivel);
  const res = await strapiGet<StrapiList<StrapiMentor>>('/users', p);
  return c.json({ data: res.data.map(mapMentor), meta: toMeta(res.meta.pagination) });
});

mentoresRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const d = await strapiGet<StrapiMentor>(`/users/${id}`, { populate: 'avatar' });
  return c.json({ data: mapMentor(d) });
});

// ─── Instituições ─────────────────────────────────────────────────────────────

export const instituicoesRoutes = new Hono();

const instFilters = paginationQuery.extend({
  tipo: z.string().optional(),
  regiao: z.string().optional(),
});

function mapInst(d: StrapiInstituicao): InstituicaoPublica {
  return {
    id: sid(d.id), slug: d.slug, nome: d.nome,
    descricao: d.descricao, logoUrl: d.logoUrl || undefined, tipo: d.tipo, regiao: d.regiao,
  };
}

instituicoesRoutes.get('/', zValidator('query', instFilters), async (c) => {
  const q = c.req.valid('query');
  const p: Record<string, string> = { populate: 'logo' };
  publishedFilter(p);
  buildPagination(p, q.page, q.limit);
  if (q.tipo) p['filters[tipo][$eq]'] = q.tipo;
  if (q.regiao) p['filters[regiao][$eq]'] = q.regiao;
  const res = await strapiGet<StrapiList<StrapiInstituicao>>('/instituicoes', p);
  return c.json({ data: res.data.map(mapInst), meta: toMeta(res.meta.pagination) });
});

instituicoesRoutes.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const p: Record<string, string> = { 'filters[slug][$eq]': slug, populate: 'logo' };
  publishedFilter(p);
  const res = await strapiGet<StrapiList<StrapiInstituicao>>('/instituicoes', p);
  const first = res.data[0];
  if (!first) return c.json({ error: 'Instituição não encontrada' }, 404);
  return c.json({ data: mapInst(first) });
});

// ─── Perfil Público ───────────────────────────────────────────────────────────

export const perfilPublicoRoutes = new Hono();

perfilPublicoRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  let useV2 = false;
  try {
    const flags = await featureFlagService.getEffectiveFlags();
    useV2 = flags['PROFILE_V2_PUBLIC'] === true;
  } catch { /* ignore */ }

  if (useV2) {
    const res = await strapiGet<{ data: StrapiPerfilPublic[] }>(`/perfis`, {
      'filters[userId][$eq]': id,
      'pagination[pageSize]': '1',
      populate: 'foto',
    });
    const first = res.data[0];
    if (!first) return c.json({ error: 'Perfil não encontrado' }, 404);
    return c.json({ data: serializePublicProfile(first as unknown as StrapiPerfil) });
  }

  const d = await strapiGet<StrapiUserPublic>(`/users/${id}`, { populate: 'avatar,role' });
  const roleName = d.role?.name.toLowerCase() ?? 'aluno';
  const perfil: PerfilPublicoBasico = {
    id: sid(d.id),
    nome: d.nome ?? d.username ?? '',
    avatarUrl: d.avatarUrl || undefined,
    bio: d.bio,
    role: roleName as Role,
  };
  return c.json({ data: perfil });
});
