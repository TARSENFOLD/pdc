/**
 * Generates apps/web/src/locales/<lng>/glossary.json from @pdc/shared glossary.ts.
 * Run: npx tsx scripts/glossary-to-i18n.ts
 * Called automatically by `npm run build -w apps/web` via prebuild hook.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Roles, ContentTypes, NavItems } from '../packages/shared/src/glossary.js';

const LOCALES = ['pt-PT', 'pt-BR', 'en'] as const;
type Locale = (typeof LOCALES)[number];

// Works in both ESM (import.meta.url) and tsx CJS mode (__dirname fallback)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCALES_DIR = join(__dirname, '../apps/web/src/locales');

function buildGlossaryJson(locale: Locale): Record<string, unknown> {
  const roles: Record<string, string> = {};
  for (const [slug, labels] of Object.entries(Roles)) {
    roles[slug] = labels[locale];
  }

  const contentTypes: Record<string, string> = {};
  for (const [slug, labels] of Object.entries(ContentTypes)) {
    contentTypes[slug] = labels[locale];
    contentTypes[`${slug}_plural`] = labels.plural[locale];
  }

  const nav: Record<string, string> = {};
  for (const [slug, labels] of Object.entries(NavItems)) {
    nav[slug] = labels[locale];
  }

  return { roles, content_types: contentTypes, nav };
}

for (const locale of LOCALES) {
  const dir = join(LOCALES_DIR, locale);
  mkdirSync(dir, { recursive: true });
  const outPath = join(dir, 'glossary.json');
  const content = JSON.stringify(buildGlossaryJson(locale), null, 2) + '\n';
  writeFileSync(outPath, content, 'utf8');
  console.warn(`[glossary-to-i18n] wrote ${outPath}`);
}

console.warn('[glossary-to-i18n] done.');
