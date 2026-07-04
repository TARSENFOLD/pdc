import type { VisibilitySettings, FieldVisibility, ReputacaoTier } from '@pdc/shared';
import { normalizeTipo } from '@pdc/shared';
import { resolvePerfilAvatar, resolvePerfilBanner } from './perfil-media.js';

export interface StrapiPerfil {
  id: string | number;
  nome?: string;
  tipo?: string;
  bio?: string;
  headline?: string;
  telefone?: string;
  website?: string;
  regiao?: string;
  socialLinks?: unknown;
  areasInteresse?: unknown;
  competencias?: unknown;
  historicoProfissional?: unknown;
  formacaoAcademica?: unknown;
  reputacao?: number;
  reputacaoTier?: ReputacaoTier;
  avatarUrl?: string;
  bannerUrl?: string;
  foto?: { url?: string } | null;
  capa?: { url?: string } | null;
  conquistas?: Array<{ id: string | number; titulo?: string; slug?: string; icone?: string }>;
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
  bannerUrl: string | null | undefined;
  bio: string | null | undefined;
  role: string;
  reputacaoTier: ReputacaoTier | null | undefined;
  headline: string | null | undefined;
  regiao: string | null | undefined;
  website: string | null | undefined;
  socialLinks: unknown;
  areasInteresse: unknown;
  competencias: unknown;
  historicoProfissional: unknown;
  formacaoAcademica: unknown;
  conquistas: Array<{ id: string; titulo: string; icone: string }>;
}

/**
 * Convert a raw Strapi profile response into the canonical StrapiPerfil shape.
 * This is NOT a cast — it validates the presence of the id and returns a typed object.
 */
function pickDefined<T extends Record<string, unknown>>(obj: T): { [K in keyof T]: T[K] } {
  const result = {} as { [K in keyof T]: T[K] };
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value as T[keyof T];
    }
  }
  return result;
}

export function toStrapiPerfil(raw: unknown): StrapiPerfil {
  if (raw == null || typeof raw !== 'object') {
    throw new Error('Raw perfil must be an object');
  }
  const record = raw as Record<string, unknown>;
  if (record.id == null) {
    throw new Error('Raw perfil must have an id');
  }
  return pickDefined({
    id: (typeof record.id === 'number' || typeof record.id === 'string' || typeof record.id === 'boolean') ? String(record.id) : '',
    nome: typeof record.nome === 'string' ? record.nome : undefined,
    tipo: typeof record.tipo === 'string' ? record.tipo : undefined,
    bio: typeof record.bio === 'string' ? record.bio : undefined,
    headline: typeof record.headline === 'string' ? record.headline : undefined,
    telefone: typeof record.telefone === 'string' ? record.telefone : undefined,
    website: typeof record.website === 'string' ? record.website : undefined,
    regiao: typeof record.regiao === 'string' ? record.regiao : undefined,
    socialLinks: record.socialLinks,
    areasInteresse: record.areasInteresse,
    competencias: record.competencias,
    historicoProfissional: record.historicoProfissional,
    formacaoAcademica: record.formacaoAcademica,
    reputacao: typeof record.reputacao === 'number' ? record.reputacao : undefined,
    reputacaoTier: typeof record.reputacaoTier === 'string' ? (record.reputacaoTier as ReputacaoTier) : undefined,
    avatarUrl: typeof record.avatarUrl === 'string' ? record.avatarUrl : undefined,
    bannerUrl: typeof record.bannerUrl === 'string' ? record.bannerUrl : undefined,
    foto: record.foto && typeof record.foto === 'object' ? (record.foto as { url?: string } | null) : undefined,
    capa: record.capa && typeof record.capa === 'object' ? (record.capa as { url?: string } | null) : undefined,
    conquistas: Array.isArray(record.conquistas) ? record.conquistas as StrapiPerfil['conquistas'] : undefined,
    visibilitySettings: record.visibilitySettings as VisibilitySettings | null | undefined,
    notificationPreferences: record.notificationPreferences,
    email: typeof record.email === 'string' ? record.email : undefined,
    userId: typeof record.userId === 'string' ? record.userId : undefined,
  }) as StrapiPerfil;
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

  const conquistas = Array.isArray(perfil.conquistas)
    ? perfil.conquistas.map((c) => ({
        id: sid(c.id),
        titulo: c.titulo ?? '',
        icone: c.icone ?? '',
      }))
    : [];

  return {
    id: sid(perfil.id),
    nome: perfil.nome ?? '',
    role: normalizeTipo(perfil.tipo ?? 'estudante'),
    reputacaoTier: perfil.reputacaoTier,
    avatarUrl: resolvePerfilAvatar(perfil.avatarUrl, perfil.foto),
    bannerUrl: resolvePerfilBanner(perfil.bannerUrl, perfil.capa),
    headline: perfil.headline,
    regiao: perfil.regiao,
    bio: isVisible(vis.bio, isConnected) ? perfil.bio : undefined,
    website: isVisible(vis.socialLinks, isConnected) ? perfil.website : undefined,
    socialLinks: isVisible(vis.socialLinks, isConnected) ? perfil.socialLinks : undefined,
    areasInteresse: isVisible(vis.areasInteresse, isConnected) ? perfil.areasInteresse : undefined,
    competencias: isVisible(vis.competencias, isConnected) ? perfil.competencias : undefined,
    historicoProfissional: isVisible(vis.historicoProfissional, isConnected) ? perfil.historicoProfissional : undefined,
    formacaoAcademica: isVisible(vis.formacaoAcademica, isConnected) ? perfil.formacaoAcademica : undefined,
    conquistas,
  };
}

/**
 * Serialize for the owner (private view). All fields returned.
 */
export function serializePrivateProfile(perfil: StrapiPerfil) {
  const conquistas = Array.isArray(perfil.conquistas)
    ? perfil.conquistas.map((c) => ({
        id: sid(c.id),
        titulo: c.titulo ?? '',
        icone: c.icone ?? '',
        slug: c.slug ?? '',
      }))
    : [];

  return {
    id: sid(perfil.id),
    nome: perfil.nome ?? '',
    email: perfil.email,
    bio: perfil.bio,
    headline: perfil.headline,
    telefone: perfil.telefone,
    website: perfil.website,
    regiao: perfil.regiao,
    socialLinks: perfil.socialLinks,
    avatarUrl: resolvePerfilAvatar(perfil.avatarUrl, perfil.foto),
    bannerUrl: resolvePerfilBanner(perfil.bannerUrl, perfil.capa),
    role: normalizeTipo(perfil.tipo ?? 'estudante'),
    reputacao: perfil.reputacao ?? 0,
    reputacaoTier: perfil.reputacaoTier,
    areasInteresse: perfil.areasInteresse,
    competencias: perfil.competencias,
    historicoProfissional: perfil.historicoProfissional,
    formacaoAcademica: perfil.formacaoAcademica,
    conquistas,
    visibilitySettings: perfil.visibilitySettings ?? {},
    notificationPreferences: perfil.notificationPreferences ?? {},
  };
}
