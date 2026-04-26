import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AreaVocacionalSchema } from '@pdc/shared';
import { strapiGet, strapiGetRaw } from '../modules/strapi/strapi.client.js';
import * as featureFlagService from '../modules/feature-flags/feature-flags.service.js';
import { serializePublicProfile, type StrapiPerfil } from '../modules/perfil/perfil.serializer.js';
import type {
  MentorPublico,
  InstituicaoPublica,
  PerfilPublicoBasico,
  CatalogoMeta,
  Role,
} from '@pdc/shared';
import { type StrapiListResponse } from '../modules/strapi/strapi.types.js';

// ─── Strapi shapes (Flat v5) ──────────────────────────────────────────────────

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

function toMeta(meta: StrapiListResponse<unknown>['meta']): CatalogoMeta {
  const p = meta.pagination;
  return { page: p.page, pageSize: p.pageSize, total: p.total, pageCount: p.pageCount };
}

function buildPagination(p: Record<string, string>, page: number, limit: number): void {
  p['pagination[page]'] = page.toString();
  p['pagination[pageSize]'] = limit.toString();
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
    role: 'mentor',
    especialidade: d.areaEspecialidade || 'Especialista',
    avatarUrl: d.avatarUrl, 
    bio: d.bio,
    areaEspecialidade: d.areaEspecialidade, 
    disponivel: d.disponivel,
  };
}

mentoresRoutes.get('/', zValidator('query', mentorFilters), async (c) => {
  const q = c.req.valid('query');
  const p: Record<string, string> = { }; 
  
  p['filters[role][name][$eq]'] = 'mentor';
  p['filters[aprovado][$eq]'] = 'true';
  
  if (q.area) p['filters[areaEspecialidade][$eq]'] = q.area;
  if (q.disponivel !== undefined) p['filters[disponivel][$eq]'] = String(q.disponivel);

  buildPagination(p, q.page, q.limit);
  
  const res = await strapiGet<StrapiMentor>('/users', p);
  return c.json({ 
    data: res.data.map(mapMentor), 
    meta: toMeta(res.meta) 
  });
});

mentoresRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const d = await strapiGetRaw<StrapiMentor>(`/users/${id}`, { }); // populate: 'avatar' removed
  if (!d) return c.json({ error: 'Mentor não encontrado' }, 404);
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
  const p: Record<string, string> = { }; // populate: 'logo' removed
  // publishedFilter(p);
  buildPagination(p, q.page, q.limit);
  if (q.tipo) p['filters[tipo][$eq]'] = q.tipo;
  if (q.regiao) p['filters[regiao][$eq]'] = q.regiao;
  const res = await strapiGet<StrapiInstituicao>('/instituicoes', p);
  return c.json({ data: res.data.map(mapInst), meta: toMeta(res.meta) });
});

instituicoesRoutes.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const p: Record<string, string> = { 'filters[slug][$eq]': slug }; // populate: 'logo' removed
  // publishedFilter(p);
  const res = await strapiGet<StrapiInstituicao>('/instituicoes', p);
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
    const res = await strapiGet<StrapiPerfilPublic>(`/perfis`, {
      'filters[userId][$eq]': id,
      'pagination[pageSize]': '1',
      populate: 'foto',
    });
    const first = res.data[0];
    if (!first) return c.json({ error: 'Perfil não encontrado' }, 404);
    
    // Type validation for StrapiPerfil
    const isStrapiPerfil = (val: any): val is StrapiPerfil => val && typeof val === 'object' && ('nome' in val || 'username' in val);
    if (!isStrapiPerfil(first)) return c.json({ error: 'Perfil inválido' }, 500);

    return c.json({ data: serializePublicProfile(first) });
  }

  const res = await strapiGet<StrapiUserPublic>(`/users/${id}`, { }); // populate: 'avatar,role' removed
  const d = res.data[0];
  if (!d) return c.json({ error: 'Utilizador não encontrado' }, 404);

  const roleName = (d.role?.name.toLowerCase() ?? 'estudante') as Role;
  const perfil: PerfilPublicoBasico = {
    id: sid(d.id),
    nome: d.nome ?? d.username ?? '',
    avatarUrl: d.avatarUrl || undefined,
    bio: d.bio,
    role: roleName,
  };
  return c.json({ data: perfil });
});
