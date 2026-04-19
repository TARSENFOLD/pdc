import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AreaVocacionalSchema } from '@pdc/shared';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import type { ExplorarResultado, AreaVocacional } from '@pdc/shared';

export const catalogoExplorarRoutes = new Hono();

// ─── Types ────────────────────────────────────────────────────────────────────

interface StrapiGenericItem {
  id: string | number;
  slug?: string;
  titulo?: string;
  nome?: string;
  descricao?: string;
  bio?: string;
  capaUrl?: string;
  avatarUrl?: string;
  logoUrl?: string;
  area?: string;
  areaEspecialidade?: string;
  tipo?: string;
}

// ─── Query ────────────────────────────────────────────────────────────────────

const explorarQuery = z.object({
  q: z.string().min(1).max(200),
  tipo: z.enum(['curso', 'simulacao', 'experiencia', 'mentor', 'instituicao']).optional(),
  area: AreaVocacionalSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
});

type TipoRecurso = 'curso' | 'simulacao' | 'experiencia' | 'mentor' | 'instituicao';

interface SearchConfig {
  endpoint: string;
  titleField: 'titulo' | 'nome';
  descField: 'descricao' | 'bio';
  capaField: 'capaUrl' | 'avatarUrl' | 'logoUrl';
  areaField: 'area' | 'areaEspecialidade' | 'tipo';
  isMentor?: boolean;
}

const CONFIGS: Record<TipoRecurso, SearchConfig> = {
  curso: { endpoint: '/cursos', titleField: 'titulo', descField: 'descricao', capaField: 'capaUrl', areaField: 'area' },
  simulacao: { endpoint: '/simulacoes', titleField: 'titulo', descField: 'descricao', capaField: 'capaUrl', areaField: 'area' },
  experiencia: { endpoint: '/experiencias', titleField: 'titulo', descField: 'descricao', capaField: 'capaUrl', areaField: 'area' },
  mentor: { endpoint: '/users', titleField: 'nome', descField: 'bio', capaField: 'avatarUrl', areaField: 'areaEspecialidade', isMentor: true },
  instituicao: { endpoint: '/instituicoes', titleField: 'nome', descField: 'descricao', capaField: 'logoUrl', areaField: 'tipo' },
};

function sid(val: string | number): string {
  return typeof val === 'number' ? val.toString() : val;
}

// ─── Route ────────────────────────────────────────────────────────────────────

catalogoExplorarRoutes.get('/', zValidator('query', explorarQuery), async (c) => {
  const { q, tipo, area, page, limit } = c.req.valid('query');

  const types: TipoRecurso[] = tipo
    ? [tipo]
    : ['curso', 'simulacao', 'experiencia', 'mentor', 'instituicao'];

  const perType = Math.max(1, Math.floor(limit / types.length));

  const fetches = types.map(async (t): Promise<ExplorarResultado[]> => {
    const cfg = CONFIGS[t];
    const params: Record<string, string> = {};

    if (cfg.isMentor) {
      params['filters[role][name][$eq]'] = 'mentor';
      params['filters[aprovado][$eq]'] = 'true';
    } else {
      params['filters[estado][$eq]'] = 'published';
      params['filters[visibilidade][$eq]'] = 'publico';
    }

    params[`filters[${cfg.titleField}][$containsi]`] = q;
    if (area) params[`filters[${cfg.areaField}][$eq]`] = area;
    params['pagination[page]'] = page.toString();
    params['pagination[pageSize]'] = perType.toString();

    try {
      // Fix: Use direct item type. Client flattens into StrapiListResponse<T>.
      const res = await strapiGet<StrapiGenericItem>(cfg.endpoint, params);
      return res.data.map((d): ExplorarResultado => ({
        tipo: t,
        id: sid(d.id),
        slug: d.slug,
        titulo: d[cfg.titleField] ?? '',
        descricao: d[cfg.descField],
        capaUrl: d[cfg.capaField],
        area: d[cfg.areaField] as AreaVocacional,
      }));
    } catch {
      return [];
    }
  });

  const allResults = await Promise.all(fetches);
  const results: ExplorarResultado[] = allResults.flat();

  return c.json({
    data: results,
    meta: { page, pageSize: limit, total: results.length, pageCount: 1 },
  });
});
