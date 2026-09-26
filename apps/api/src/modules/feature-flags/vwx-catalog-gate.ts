import { isFeatureEnabledFailClosed } from './cor-0001-gates.js';

export interface ExperienceVariantCarrier {
  tipoExperiencia?: string | undefined;
}

export async function isVwxCatalogEnabled(): Promise<boolean> {
  return isFeatureEnabledFailClosed('vwx_catalog_enabled');
}

export async function applyExperienceVariantFilter(params: Record<string, string | string[]>, tipo?: 'institucional' | 'vwx') {
  const enabled = await isVwxCatalogEnabled();
  if (tipo === 'vwx') params['filters[tipoExperiencia][$eq]'] = 'vwx';
  if (!enabled && tipo === 'vwx') params['filters[id][$eq]'] = '0';
  if (!enabled || tipo === 'institucional') {
    params['filters[$and][0][$or][0][tipoExperiencia][$eq]'] = 'institucional';
    params['filters[$and][0][$or][1][tipoExperiencia][$null]'] = 'true';
  }
}

export function filterVwxExperiences<T extends ExperienceVariantCarrier>(
  experiences: T[],
  vwxCatalogEnabled: boolean,
): T[] {
  if (vwxCatalogEnabled) return experiences;
  return experiences.filter((experience) => experience.tipoExperiencia !== 'vwx');
}

export function canExposeExperience(
  experience: ExperienceVariantCarrier,
  vwxCatalogEnabled: boolean,
): boolean {
  return vwxCatalogEnabled || experience.tipoExperiencia !== 'vwx';
}
