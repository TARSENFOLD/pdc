import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import pino from 'pino';
import { AreaVocacionalSchema } from '@pdc/shared';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { optionalJwt, type OptionalAuthVariables } from '../modules/auth/auth.middleware.js';
import { serializePublicProfile, type StrapiPerfil } from '../modules/perfil/perfil.serializer.js';
import {
  RoleSchema,
  InstituicaoPublicaDetalhadaSchema,
  type MentorPublico,
  type InstituicaoPublicaDetalhada,
  type PerfilPublicoBasico,
  type CatalogoMeta,
  type Role,
} from '@pdc/shared';
import { type StrapiListResponse } from '../modules/strapi/strapi.types.js';
import { resolvePerfilAvatar } from '../modules/perfil/perfil-media.js';
import { instituicaoService } from '../modules/instituicoes/instituicao.service.js';
import type { StrapiInstituicao as InstituicaoCanonica } from '../modules/instituicoes/instituicao.types.js';

const log = pino({ name: 'catalogo-pessoas' });

// ─── Strapi shapes (Flat v5) ──────────────────────────────────────────────────

interface StrapiMentor {
  id: string | number;
  nome?: string;
  avatarUrl?: string;
  foto?: { url?: string } | null;
  bio?: string;
  areaFormacao?: string;
  areaEspecialidade?: string;
  disponivel?: boolean;
}

interface StrapiInstituicao extends InstituicaoCanonica { regiao?: string }

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

interface StrapiPessoaCatalogo {
  id: string | number;
  nome?: string;
  tipo?: string;
  bio?: string;
  headline?: string;
  avatarUrl?: string;
  foto?: { url?: string } | null;
  areaFormacao?: string;
  areasInteresse?: string[] | string | null;
  reputacao?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

function sid(val: string | number): string {
  return typeof val === 'number' ? val.toString() : val;
}

function toMeta(meta: StrapiListResponse<unknown>['meta']): CatalogoMeta {
  const p = meta.pagination;
  return { page: p.page, pageSize: p.pageSize, total: p.total, pageCount: p.pageCount };
}

function buildPagination(p: Record<string, string>, page: number, limit: number, pageSize?: number): void {
  p['pagination[page]'] = page.toString();
  p['pagination[pageSize]'] = (pageSize ?? limit).toString();
}

function buildPerfilPublicoFilters(id: string): Record<string, string> {
  if (/^\d+$/.test(id)) {
    return {
      'filters[$or][0][id][$eq]': id,
      'filters[$or][1][userId][$eq]': id,
    };
  }

  return {
    'filters[userId][$eq]': id,
  };
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
    nome: d.nome ?? '',
    avatarUrl: resolvePerfilAvatar(d.avatarUrl, d.foto),
    bio: d.bio,
    areaEspecialidade: d.areaEspecialidade ?? d.areaFormacao ?? 'Especialista',
    reputacaoTier: 'BRONZE',
    disponivel: d.disponivel ?? true,
  };
}

mentoresRoutes.get('/', zValidator('query', mentorFilters), async (c) => {
  const q = c.req.valid('query');
  const p: Record<string, string> = { };

  p['filters[tipo][$eq]'] = 'mentor';
  p['filters[aprovado][$eq]'] = 'true';

  if (q.area) p['filters[areaFormacao][$eq]'] = q.area;
  if (q.disponivel !== undefined) p['filters[disponivel][$eq]'] = String(q.disponivel);
  p['populate'] = 'foto';

  buildPagination(p, q.page, q.limit, q.pageSize);

  try {
    const res = await strapiGet<StrapiMentor>('/perfis', p);
    return c.json({
      data: res.data.map(mapMentor),
      meta: toMeta(res.meta)
    });
  } catch (err) {
    log.error({ err, params: p }, 'Failed to fetch mentores catalog');
    return c.json({ error: 'Falha ao carregar catálogo de mentores' }, 502);
  }
});

mentoresRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Mentor não encontrado' }, 404);
  try {
    const res = await strapiGet<StrapiMentor>('/perfis', {
      'filters[id][$eq]': id,
      'filters[tipo][$eq]': 'mentor',
      'populate': 'foto',
      'pagination[pageSize]': '1',
    });
    const first = res.data[0];
    if (!first) return c.json({ error: 'Mentor não encontrado' }, 404);
    return c.json({ data: mapMentor(first) });
  } catch (err) {
    log.error({ err, id }, 'Failed to fetch mentor detail');
    return c.json({ error: 'Falha ao carregar mentor' }, 502);
  }
});

// ─── Instituições ─────────────────────────────────────────────────────────────

export const instituicoesRoutes = new Hono();

const instFilters = paginationQuery.extend({
  tipo: z.string().optional(),
  regiao: z.string().optional(),
  provincia: z.string().optional(),
  area: z.string().optional(),
  natureza: z.string().optional(),
});

function mapInst(d: StrapiInstituicao): InstituicaoPublicaDetalhada {
  return InstituicaoPublicaDetalhadaSchema.parse(instituicaoService.mapPublica(d));
}

instituicoesRoutes.get('/', zValidator('query', instFilters), async (c) => {
  try {
    const q = c.req.valid('query');
    const p: Record<string, string> = {
      'filters[estado][$eq]': 'verified',
      'populate[enderecoEstruturado]': '*',
      'populate[contactosInstitucionais]': '*',
      'populate[acreditacoes]': '*',
      'populate[politicas]': '*',
    };
    buildPagination(p, q.page, q.limit, q.pageSize);
    if (q.tipo) p['filters[tipo][$eq]'] = q.tipo;
    if (q.regiao) p['filters[regiao][$eq]'] = q.regiao;
    if (q.provincia) p['filters[enderecoEstruturado][provincia][$eq]'] = q.provincia;
    if (q.area) p['filters[areasAtividade][$contains]'] = q.area;
    if (q.natureza) p['filters[natureza][$eq]'] = q.natureza;
    const res = await strapiGet<StrapiInstituicao>('/instituicoes', p);
    return c.json({ data: res.data.map(mapInst), meta: toMeta(res.meta) });
  } catch (err) {
    log.error({ err }, 'Failed to fetch instituicoes catalog');
    return c.json({ error: 'Falha ao carregar catálogo de instituições' }, 502);
  }
});

instituicoesRoutes.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const p: Record<string, string> = {
      'filters[slug][$eq]': slug,
      'filters[estado][$eq]': 'verified',
      'populate[enderecoEstruturado]': '*',
      'populate[contactosInstitucionais]': '*',
      'populate[acreditacoes]': '*',
      'populate[politicas]': '*',
    };
    const res = await strapiGet<StrapiInstituicao>('/instituicoes', p);
    const first = res.data[0];
    if (!first) return c.json({ error: 'Instituição não encontrada' }, 404);
    return c.json({ data: mapInst(first) });
  } catch (err) {
    log.error({ err }, 'Failed to fetch instituicao detail');
    return c.json({ error: 'Falha ao carregar instituição' }, 502);
  }
});

// ─── Pessoas ─────────────────────────────────────────────────────────────────

export const pessoasRoutes = new Hono();

const pessoaFilters = paginationQuery.extend({
  role: z.enum(['estudante', 'mentor']).optional().default('estudante'),
  search: z.string().optional(),
  area: AreaVocacionalSchema.optional(),
});

function isRole(value: string | undefined): value is Role {
  if (value === undefined) return false;
  return RoleSchema.safeParse(value).success;
}

function firstString(value: string[] | string | null | undefined): string | undefined {
  if (Array.isArray(value)) {
    const first = value.find((item): item is string => typeof item === 'string' && item.length > 0);
    return first;
  }
  if (typeof value === 'string' && value.length > 0) return value;
  return undefined;
}

function mapPessoa(d: StrapiPessoaCatalogo): PerfilPublicoBasico & { area?: string } {
  const role = isRole(d.tipo) ? d.tipo : 'estudante';
  const pessoa: PerfilPublicoBasico & { area?: string } = {
    id: sid(d.id),
    nome: d.nome ?? 'Perfil PDC',
    avatarUrl: resolvePerfilAvatar(d.avatarUrl, d.foto) ?? null,
    role,
    reputacaoTier: 'BRONZE',
  };
  const area = d.areaFormacao ?? firstString(d.areasInteresse);
  if (d.bio) pessoa.bio = d.bio;
  if (d.headline) pessoa.headline = d.headline;
  if (area) pessoa.area = area;
  return pessoa;
}

pessoasRoutes.get('/', zValidator('query', pessoaFilters), async (c) => {
  const q = c.req.valid('query');
  const p: Record<string, string> = {
    'filters[tipo][$eq]': q.role,
    'filters[ativo][$ne]': 'false',
    'populate': 'foto',
  };

  if (q.search) p['filters[nome][$containsi]'] = q.search;
  if (q.area) p['filters[$or][0][areaFormacao][$eq]'] = q.area;
  if (q.area) p['filters[$or][1][areasInteresse][$containsi]'] = q.area;
  buildPagination(p, q.page, q.limit, q.pageSize);

  try {
    const res = await strapiGet<StrapiPessoaCatalogo>('/perfis', p);
    return c.json({
      data: res.data.map(mapPessoa),
      meta: toMeta(res.meta),
    });
  } catch (err) {
    log.error({ err, params: p }, 'Failed to fetch pessoas catalog');
    return c.json({ error: 'Erro ao buscar catálogo de pessoas' }, 502);
  }
});

// ─── Perfil Público ───────────────────────────────────────────────────────────

export const perfilPublicoRoutes = new Hono<{ Variables: OptionalAuthVariables }>();
perfilPublicoRoutes.use('*', optionalJwt);

perfilPublicoRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  try {
    const perfilRes = await strapiGet<StrapiPerfilPublic>(`/perfis`, {
      ...buildPerfilPublicoFilters(id),
      'pagination[pageSize]': '1',
      populate: 'foto',
    });
    const first = perfilRes.data[0];

    if (first) {
      // Type validation for StrapiPerfil
      const isStrapiPerfil = (val: unknown): val is StrapiPerfil => val !== null && typeof val === 'object' && 'id' in val;
      if (!isStrapiPerfil(first)) return c.json({ error: 'Perfil inválido' }, 500);

      return c.json({ data: serializePublicProfile(first) });
    }

    return c.json({ error: 'Perfil não encontrado' }, 404);
  } catch (err) {
    log.error({ err, id }, 'Failed to fetch public profile');
    return c.json({ error: 'Falha ao carregar perfil público' }, 502);
  }
});
