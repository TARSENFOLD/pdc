/**
 * CI gate: scans .tsx/.ts files for hardcoded user-facing strings.
 * Run: npx tsx apps/web/src/lib/i18n/extract.ts
 * In this phase (T1) output is informational only — exits 0.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SRC_DIR = join(__dirname, '../../..');

// Patterns that suggest hardcoded UI strings (simplified heuristic)
const HARDCODED_PATTERNS = [
  // JSX text content with Portuguese or long English words
  />([A-ZÁÉÍÓÚÀÂÃÊÔÇÜ][a-záéíóúàâãêôçü\s]{4,})</g,
  // placeholder / aria-label / title with string literals
  /(?:placeholder|aria-label|title)=\{?"([^"]{5,})"\}?/g,
];

const IGNORED_DIRS = ['node_modules', 'dist', '.git', 'locales'];
const IGNORED_FILES = ['extract.ts', 'strapi-override.ts'];

interface HardcodedEntry {
  file: string;
  line: number;
  match: string;
}

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.includes(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walk(full));
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      if (!IGNORED_FILES.some((f) => full.endsWith(f))) {
        files.push(full);
      }
    }
  }
  return files;
}

function scan(): HardcodedEntry[] {
  const entries: HardcodedEntry[] = [];
  const files = walk(SRC_DIR);

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      for (const pattern of HARDCODED_PATTERNS) {
        pattern.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(line)) !== null) {
          const match = m[1] ?? m[0];
          if (match.length > 4) {
            entries.push({ file: file.replace(SRC_DIR + '/', ''), line: i + 1, match });
          }
        }
      }
    }
  }
  return entries;
}

const results = scan();
console.warn(`[i18n/extract] Found ${results.length.toString()} potential hardcoded strings.`);
if (results.length > 0) {
  console.warn('[i18n/extract] Top 20:');
  results.slice(0, 20).forEach(({ file, line, match }) => {
    console.warn(`  ${file}:${String(line)} — "${match}"`);
  });
}
// Informational only in T1 — exits 0
process.exit(0);
