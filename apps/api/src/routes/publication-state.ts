const PUBLIC_CATALOG_ESTADOS = ['approved', 'published'] as const;

export function applyPublicCatalogStateFilter(params: Record<string, string | string[]>): void {
  params['filters[estado][$in]'] = [...PUBLIC_CATALOG_ESTADOS];
}

export function isPublicCatalogEstado(estado: string | undefined): boolean {
  return PUBLIC_CATALOG_ESTADOS.includes(estado as (typeof PUBLIC_CATALOG_ESTADOS)[number]);
}
