/**
 * Strapi copy override — non-blocking merge of Strapi CMS copy into i18next resources.
 * If Strapi is unreachable or returns invalid data, i18n continues with bundled fallbacks.
 */
import { i18n } from './index.js';

import { z } from 'zod';

const StrapiCopyEntrySchema = z.object({
  key: z.string(),
  value: z.string(),
  namespace: z.string(),
  locale: z.string()
});

const StrapiCopyResponseSchema = z.object({
  entries: z.array(StrapiCopyEntrySchema).optional()
});

export async function applyStrapiOverrides(apiUrl: string): Promise<void> {
  try {
    const res = await fetch(`${apiUrl}/api/copy-overrides`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return;
    const json: unknown = await res.json();
    const parsed = StrapiCopyResponseSchema.safeParse(json);
    if (!parsed.success) return;
    const entries = parsed.data.entries ?? [];
    for (const { key, value, namespace, locale } of entries) {
      i18n.addResourceBundle(locale, namespace, unflatten(key, value), true, true);
    }
  } catch {
    // Strapi down or timeout — silently continue with bundled copy
  }
}

function unflatten(dotKey: string, value: string): Record<string, unknown> {
  const parts = dotKey.split('.');
  const result: Record<string, unknown> = {};
  let current = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i] as string;
    current[part] = {} as Record<string, unknown>;
    current = current[part] as Record<string, unknown>;
  }
  const lastPart = parts[parts.length - 1] as string;
  current[lastPart] = value;
  return result;
}
