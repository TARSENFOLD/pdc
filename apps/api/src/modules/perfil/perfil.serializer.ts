import type { VisibilitySettings, FieldVisibility, ReputacaoTier } from '@pdc/shared';
import { normalizeTipo } from '@pdc/shared';

export interface StrapiPerfil {
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
  reputacao?: number;
  reputacaoTier?: ReputacaoTier;
  avatarUrl?: string;
  foto?: { url?: string } | null;
  visibilitySettings?: VisibilitySettings | null;
  notificationPreferences?: unknown;
  email?: string;
  userId?: string;
  [key: string]: unknown;
}

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
  avatarUrl: string | null | undefined;
  bio: string | null | undefined;
  role: string;
  reputacaoTier: ReputacaoTier | null | undefined;
  headline: string | null | undefined;
  website: string | null | undefined;
  socialLinks: unknown;
  areasInteresse: unknown;
  competencias: unknown;
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
  const vis: Partial<VisibilitySettings> = perfil.visibilitySettings ?? {};

  const result: PublicProfileResult = {
    id: sid(perfil.id),
    nome: perfil.nome ?? '',
    role: normalizeTipo(perfil.tipo ?? 'estudante'),
    reputacaoTier: perfil.reputacaoTier,
    avatarUrl: perfil.foto?.url ?? perfil.avatarUrl,
    headline: perfil.headline,
    bio: isVisible(vis.bio, isConnected) ? perfil.bio : undefined,
    website: isVisible(vis.socialLinks, isConnected) ? perfil.website : undefined,
    socialLinks: isVisible(vis.socialLinks, isConnected) ? perfil.socialLinks : undefined,
    areasInteresse: isVisible(vis.areasInteresse, isConnected) ? perfil.areasInteresse : undefined,
    competencias: isVisible(vis.competencias, isConnected) ? perfil.competencias : undefined,
  };

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
    role: normalizeTipo(perfil.tipo ?? 'estudante'),
    reputacao: perfil.reputacao ?? 0,
    reputacaoTier: perfil.reputacaoTier,
    areasInteresse: perfil.areasInteresse,
    competencias: perfil.competencias,
    visibilitySettings: perfil.visibilitySettings ?? {},
    notificationPreferences: perfil.notificationPreferences ?? {},
  };
}
