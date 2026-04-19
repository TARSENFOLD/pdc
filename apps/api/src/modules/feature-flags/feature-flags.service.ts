import pino from 'pino';
import { redis } from '../../lib/redis.js';
import { strapiGet, strapiPut, strapiPost, strapiDelete } from '../strapi/strapi.client.js';

const log = pino({ name: 'feature-flags' });

const CACHE_KEY = 'feature-flags:all';
const CACHE_TTL = 60; // seconds

export interface FeatureFlag {
  id: number;
  documentId?: string;
  domain: string;
  enabled: boolean;
  description: string | null;
  overrides: FlagOverride[] | null;
}

export interface FlagOverride {
  instituicaoId: number;
  enabled: boolean;
}

async function getAllFlags(): Promise<FeatureFlag[]> {
  const cached = await redis.get<FeatureFlag[]>(CACHE_KEY);
  if (cached) return cached;

  // Fix: Generic type already represents the item.
  const res = await strapiGet<FeatureFlag>('/feature-flags', {
    'pagination[pageSize]': '100',
  });

  const flags = res.data;
  await redis.set(CACHE_KEY, flags, { ex: CACHE_TTL });
  return flags;
}

async function invalidateCache(): Promise<void> {
  await redis.del(CACHE_KEY);
}

/**
 * Returns effective flags for a given context.
 * Invariant: flag absent = disabled (false).
 * Invariant: institution override takes precedence over global default.
 */
export async function getEffectiveFlags(
  instituicaoId?: number,
): Promise<Record<string, boolean>> {
  const flags = await getAllFlags();
  const result: Record<string, boolean> = {};

  for (const flag of flags) {
    let effective = flag.enabled;

    if (instituicaoId != null && Array.isArray(flag.overrides)) {
      const override = flag.overrides.find(
        (o) => o.instituicaoId === instituicaoId,
      );
      if (override !== undefined) {
        effective = override.enabled;
      }
    }

    result[flag.domain] = effective;
  }

  return result;
}

/**
 * Create or update (upsert) a flag's global default.
 */
export async function upsertDefault(
  domain: string,
  enabled: boolean,
  description?: string,
): Promise<FeatureFlag> {
  const all = await getAllFlags();
  const existing = all.find((f) => f.domain === domain);

  let result: FeatureFlag;

  if (existing) {
    const body: Record<string, unknown> = { enabled };
    if (description !== undefined) body['description'] = description;
    // Fix: StrapiSingleResponse already provides res.data as the T type.
    const res = await strapiPut<FeatureFlag>(
      `/feature-flags/${existing.documentId ?? String(existing.id)}`,
      body,
    );
    result = res.data;
  } else {
    const res = await strapiPost<FeatureFlag>('/feature-flags', {
      domain,
      enabled,
      description: description ?? null,
      overrides: [],
    });
    result = res.data;
  }

  await invalidateCache();
  log.info({ domain, enabled }, 'Flag default updated');
  return result;
}

/**
 * Update global default, strictly if exists (returns null otherwise).
 */
export async function updateDefaultStrict(
  domain: string,
  enabled: boolean,
): Promise<FeatureFlag | null> {
  const all = await getAllFlags();
  const existing = all.find((f) => f.domain === domain);
  if (!existing) return null;

  const res = await strapiPut<FeatureFlag>(
    `/feature-flags/${existing.documentId ?? String(existing.id)}`,
    { enabled },
  );
  await invalidateCache();
  return res.data;
}

/**
 * Set an institution-level override for a flag.
 */
export async function setInstitutionOverride(
  domain: string,
  instituicaoId: number,
  enabled: boolean,
): Promise<FeatureFlag | null> {
  const all = await getAllFlags();
  const flag = all.find((f) => f.domain === domain);
  if (!flag) return null;

  const overrides: FlagOverride[] = Array.isArray(flag.overrides)
    ? flag.overrides.filter((o) => o.instituicaoId !== instituicaoId)
    : [];
  overrides.push({ instituicaoId, enabled });

  const res = await strapiPut<FeatureFlag>(
    `/feature-flags/${flag.documentId ?? String(flag.id)}`,
    { overrides },
  );

  await invalidateCache();
  log.info({ domain, instituicaoId, enabled }, 'Flag institution override set');
  return res.data;
}

/**
 * Remove an institution-level override for a flag.
 */
export async function removeInstitutionOverride(
  domain: string,
  instituicaoId: number,
): Promise<FeatureFlag | null> {
  const all = await getAllFlags();
  const flag = all.find((f) => f.domain === domain);
  if (!flag) return null;

  const overrides: FlagOverride[] = Array.isArray(flag.overrides)
    ? flag.overrides.filter((o) => o.instituicaoId !== instituicaoId)
    : [];

  const res = await strapiPut<FeatureFlag>(
    `/feature-flags/${flag.documentId ?? String(flag.id)}`,
    { overrides },
  );

  await invalidateCache();
  log.info({ domain, instituicaoId }, 'Flag institution override removed');
  return res.data;
}

/**
 * List all flags (admin view).
 */
export async function listAll(): Promise<FeatureFlag[]> {
  return getAllFlags();
}

/**
 * Delete a flag entirely.
 */
export async function deleteFlag(domain: string): Promise<void> {
  const all = await getAllFlags();
  const flag = all.find((f) => f.domain === domain);
  if (!flag) return;

  await strapiDelete<unknown>(`/feature-flags/${flag.documentId ?? String(flag.id)}`);
  await invalidateCache();
  log.info({ domain }, 'Flag deleted');
}

export const featureFlagService = {
  getEffectiveFlags,
  upsertDefault,
  updateDefaultStrict,
  setInstitutionOverride,
  removeInstitutionOverride,
  listAll,
  deleteFlag,
};
