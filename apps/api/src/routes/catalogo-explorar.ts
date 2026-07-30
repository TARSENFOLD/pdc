import { Hono } from 'hono';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { 
  type ExplorarResultado, 
  type ExplorarItem, 
  type ExplorarItemTipo 
} from '@pdc/shared';
import { applyPublicCatalogStateFilter } from './publication-state.js';
import {
  filterVwxExperiences,
  isVwxCatalogEnabled,
} from '../modules/feature-flags/vwx-catalog-gate.js';

export const catalogoExplorarRoutes = new Hono();

interface CatalogoExplorarEntity {
  id: string | number;
  slug?: string;
  titulo?: string;
  descricao?: string;
  area?: string;
  capaUrl?: string;
  nome?: string;
  bio?: string;
  areaInteresse?: string;
  regiao?: string;
  avatarUrl?: string;
  logoUrl?: string;
  tipoExperiencia?: 'institucional' | 'vwx';
}

type CatalogoField = keyof Omit<CatalogoExplorarEntity, 'id'>;

interface ExplorarConfig {
  endpoint: string;
  titleField: CatalogoField;
  descField: CatalogoField;
  areaField: CatalogoField;
  capaField: CatalogoField;
  isMentor?: boolean;
  isInstituicao?: boolean;
}

const CONFIGS: Record<ExplorarItemTipo, ExplorarConfig> = {
  curso: { endpoint: '/cursos', titleField: 'titulo', descField: 'descricao', areaField: 'area', capaField: 'capaUrl' },
  simulacao: { endpoint: '/simulacoes', titleField: 'titulo', descField: 'descricao', areaField: 'area', capaField: 'capaUrl' },
  experiencia: { endpoint: '/experiencias', titleField: 'titulo', descField: 'descricao', areaField: 'area', capaField: 'capaUrl' },
  mentor: { endpoint: '/perfis', titleField: 'nome', descField: 'bio', areaField: 'areaInteresse', capaField: 'avatarUrl', isMentor: true },
  instituicao: { endpoint: '/instituicoes', titleField: 'nome', descField: 'descricao', areaField: 'regiao', capaField: 'logoUrl', isInstituicao: true },
  perfil: { endpoint: '/perfis', titleField: 'nome', descField: 'bio', areaField: 'regiao', capaField: 'avatarUrl' },
};

const EXPLORAR_TYPES: ExplorarItemTipo[] = ['curso', 'simulacao', 'experiencia', 'mentor', 'instituicao', 'perfil'];

function isExplorarItemTipo(value: string | undefined): value is ExplorarItemTipo {
  return value !== undefined && EXPLORAR_TYPES.includes(value as ExplorarItemTipo);
}

function sid(id: string | number): string {
  return typeof id === 'number' ? id.toString() : id;
}

function fieldValue(item: CatalogoExplorarEntity, field: CatalogoField): string {
  return item[field] ?? '';
}

/**
 * GET /catalogo/explorar
 * Procura unificada por cursos, simulações, mentores e instituições.
 */
catalogoExplorarRoutes.get('/', async (c) => {
  const q = c.req.query('search') || '';
  const area = c.req.query('area');
  const rawTipo = c.req.query('tipo');
  const tipo = isExplorarItemTipo(rawTipo) ? rawTipo : undefined;
  const page = Number(c.req.query('page') || '1');
  const limit = Number(c.req.query('pageSize') || '20');

  const types = tipo
    ? [tipo] 
    : (['curso', 'simulacao', 'experiencia', 'mentor', 'instituicao'] as ExplorarItemTipo[]);

  const perType = Math.max(1, Math.floor(limit / types.length));
  const vwxCatalogEnabled = await isVwxCatalogEnabled();

  const fetches = types.map(async (t): Promise<ExplorarItem[]> => {
    const cfg = CONFIGS[t];
    const params: Record<string, string | string[]> = {};

    if (cfg.isMentor) {
      params['filters[role][name][$eq]'] = 'mentor';
      params['filters[aprovado][$eq]'] = 'true';
    } else if (cfg.isInstituicao) {
      params['filters[estado][$eq]'] = 'verified';
    } else {
      applyPublicCatalogStateFilter(params);
    }

    params[`filters[${cfg.titleField}][$containsi]`] = q;
    if (area) params[`filters[${cfg.areaField}][$eq]`] = area;
    params['pagination[page]'] = page.toString();
    params['pagination[pageSize]'] = perType.toString();

    try {
      const res = await strapiGet<CatalogoExplorarEntity>(cfg.endpoint, params);
      const visible = t === 'experiencia'
        ? filterVwxExperiences(res.data, vwxCatalogEnabled)
        : res.data;
      return visible.map((d): ExplorarItem => ({
        tipo: t,
        id: sid(d.id),
        slug: d.slug ?? sid(d.id),
        titulo: fieldValue(d, cfg.titleField),
        descricao: fieldValue(d, cfg.descField),
        capaUrl: fieldValue(d, cfg.capaField),
        area: fieldValue(d, cfg.areaField),
      }));
    } catch {
      return [];
    }
  });

  const allResults = await Promise.all(fetches);
  const items = allResults.flat();

  const response: ExplorarResultado = {
    data: items,
    meta: { page, pageSize: limit, total: items.length, pageCount: 1 },
  };

  return c.json(response);
});
