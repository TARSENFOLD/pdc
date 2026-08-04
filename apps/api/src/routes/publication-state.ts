import { applyAuthoritativePublicContentFilter } from '../modules/conteudo/content-access.service.js';

export function applyPublicCatalogStateFilter(params: Record<string, string | string[]>): void {
  applyAuthoritativePublicContentFilter(params);
}

export function isPublicCatalogEstado(estado: string | undefined): boolean {
  return estado === 'approved';
}
