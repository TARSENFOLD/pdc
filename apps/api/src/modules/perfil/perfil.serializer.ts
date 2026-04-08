import type { VisibilitySettings, FieldVisibility } from '@pdc/shared';

interface StrapiPerfil {
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
  visibilitySettings?: VisibilitySettings | null;
  notificationPreferences?: unknown;
  email?: string;
  [key: string]: unknown;
}

const PRIVATE_FIELDS = ['email', 'telefone', 'notificationPreferences', 'preferenciasUi', 'documentos'] as const;

function sid(val: string | number): string {
  return typeof val === 'number' ? val.toString() : val;
}

function isVisible(setting: FieldVisibility | undefined, isConnected: boolean): boolean {
  if (!setting || setting === 'publico') return true;
  if (setting === 'conexoes') return isConnected;
  return false; // 'privado'
}

export interface PublicProfileResult {
  id: string;
  nome: string;
  avatarUrl?: string;
  bio?: string;
  role: string;
  headline?: string;
  website?: string;
  socialLinks?: unknown;
  areasInteresse?: unknown;
  competencias?: unknown;
}

/**
 * Serialize a Strapi perfil for public consumption.
 * Respects field-level visibilitySettings.
 * Invariant: fields marked 'privado' are NEVER exposed.
 */
export function serializePublicProfile(
  perfil: StrapiPerfil,
  isConnected = false,
): PublicProfileResult {
  const vis = perfil.visibilitySettings ?? {};

  const result: PublicProfileResult = {
    id: sid(perfil.id),
    nome: perfil.nome ?? '',
    avatarUrl: perfil.foto?.url ?? perfil.avatarUrl,
    role: perfil.tipo ?? 'aluno',
  };

  if (perfil.headline) result.headline = perfil.headline;

  if (isVisible(vis.bio, isConnected) && perfil.bio) {
    result.bio = perfil.bio;
  }

  if (isVisible(vis.socialLinks, isConnected)) {
    if (perfil.website) result.website = perfil.website;
    if (perfil.socialLinks) result.socialLinks = perfil.socialLinks;
  }

  if (isVisible(vis.areasInteresse, isConnected) && perfil.areasInteresse) {
    result.areasInteresse = perfil.areasInteresse;
  }

  if (isVisible(vis.competencias, isConnected) && perfil.competencias) {
    result.competencias = perfil.competencias;
  }

  return result;
}

/**
 * Serialize for the owner (private view). All fields returned.
 */
export function serializePrivateProfile(perfil: StrapiPerfil) {
  return {
    id: sid(perfil.id),
    nome: perfil.nome ?? '',
    email: perfil.email,
    bio: perfil.bio,
    headline: perfil.headline,
    telefone: perfil.telefone,
    website: perfil.website,
    socialLinks: perfil.socialLinks,
    avatarUrl: perfil.foto?.url ?? perfil.avatarUrl,
    role: perfil.tipo ?? 'aluno',
    areasInteresse: perfil.areasInteresse,
    competencias: perfil.competencias,
    visibilitySettings: perfil.visibilitySettings ?? {},
    notificationPreferences: perfil.notificationPreferences ?? {},
  };
}
