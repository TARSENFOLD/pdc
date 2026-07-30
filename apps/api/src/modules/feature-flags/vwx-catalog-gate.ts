import { isFeatureEnabledFailClosed } from './cor-0001-gates.js';

export interface ExperienceVariantCarrier {
  tipoExperiencia?: string;
}

export async function isVwxCatalogEnabled(): Promise<boolean> {
  return isFeatureEnabledFailClosed('vwx_catalog_enabled');
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
