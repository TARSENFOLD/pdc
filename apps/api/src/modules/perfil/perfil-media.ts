interface LegacyMediaRelation {
  url?: string;
}

export function resolvePerfilAvatar(
  avatarUrl?: string | null,
  foto?: LegacyMediaRelation | null,
  fallback?: string,
): string | undefined {
  return avatarUrl ?? foto?.url ?? fallback;
}

export function resolvePerfilBanner(
  bannerUrl?: string | null,
  capa?: LegacyMediaRelation | null,
): string | undefined {
  return bannerUrl ?? capa?.url;
}
