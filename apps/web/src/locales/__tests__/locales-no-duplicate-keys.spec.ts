import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

type JsonObject = Record<string, unknown>;

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesRoot = resolve(__dirname, '..');
const localeFiles = ['pt-BR/common.json', 'pt-PT/common.json'] as const;
const canonicalDuplicateNamespaces = ['aprovacao'] as const;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readLocale(relativePath: string): JsonObject {
  const raw = readFileSync(resolve(localesRoot, relativePath), 'utf8');
  const parsed: unknown = JSON.parse(raw);

  if (!isJsonObject(parsed)) {
    throw new Error(`Locale ${relativePath} must be a JSON object`);
  }

  return parsed;
}

function hasKeyAtPath(object: JsonObject, path: readonly string[]): boolean {
  let current: unknown = object;

  for (const segment of path) {
    if (!isJsonObject(current) || !(segment in current)) {
      return false;
    }

    current = current[segment];
  }

  return true;
}

describe('locale duplicate canonical namespaces', () => {
  it.each(localeFiles)('does not duplicate canonical auth namespace entries in %s', (relativePath) => {
    const locale = readLocale(relativePath);

    for (const namespace of canonicalDuplicateNamespaces) {
      const rootPathExists = hasKeyAtPath(locale, [namespace]);
      const authPathExists = hasKeyAtPath(locale, ['auth', namespace]);

      expect(
        rootPathExists && authPathExists,
        `${relativePath} must not expose both ${namespace} and auth.${namespace}`
      ).toBe(false);
    }
  });
});
