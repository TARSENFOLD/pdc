import type { ExplorarItemTipo } from '@pdc/shared';

export type CatalogoLinkType = Exclude<ExplorarItemTipo, 'perfil'> | 'programa';

const ROUTE_BY_TYPE: Record<CatalogoLinkType, string> = {
  curso: 'cursos',
  simulacao: 'simulacoes',
  experiencia: 'experiencias',
  mentor: 'mentores',
  instituicao: 'instituicoes',
  programa: 'programas',
};

export function resolveCatalogHref(type: CatalogoLinkType, idOrSlug: string, inApp: boolean): string {
  const base = inApp ? '/app' : '';
  return `${base}/${ROUTE_BY_TYPE[type]}/${idOrSlug}`;
}
