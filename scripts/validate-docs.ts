/**
 * validate-docs.ts
 * CI gate: validates internal links and doc→code references in Markdown files.
 * Exit code 1 if any broken link or missing code reference is found.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DOC_GLOBS = [
  'docs/**/*.md',
  '.planning/**/*.md',
  'specs/**/*.md',
  '*.md',
  'apps/*/README.md',
  'apps/web/DESIGN.md',
  'audit/**/*.md',
];

// Historical snapshots and future specs — paths may reference renamed/removed files intentionally
const SKIP_PATHS = [
  'docs/_archive',
  'docs/audit',
  'docs/arquivo-fundacional',
  'docs/a_implementar',
  'audit/',
  'node_modules',
  'dist',
];

interface Issue {
  file: string;
  line: number;
  type: 'broken-link' | 'missing-code-ref';
  value: string;
}

function shouldSkip(filePath: string): boolean {
  return SKIP_PATHS.some((skip) => filePath.includes(skip));
}

function resolveInternalLink(fromFile: string, link: string): string | null {
  if (link.startsWith('http') || link.startsWith('mailto:') || link.startsWith('#')) {
    return null;
  }
  const anchor = link.includes('#') ? link.split('#')[0] : link;
  if (!anchor) return null;
  const dir = path.dirname(fromFile);
  // Decode URL-encoded characters (e.g. %28 → '(') before resolving the path
  const decoded = decodeURIComponent(anchor);
  return path.resolve(dir, decoded);
}

function fileExistsWithFallbacks(ref: string): boolean {
  if (fs.existsSync(path.resolve(ROOT, ref))) return true;
  // src/... paths are relative to the web app root (apps/web/)
  if (ref.startsWith('src/') && fs.existsSync(path.resolve(ROOT, 'apps/web', ref))) return true;
  // Feature/component/page paths without prefix are in apps/web/src/
  if (
    (ref.startsWith('features/') ||
      ref.startsWith('components/') ||
      ref.startsWith('pages/') ||
      ref.startsWith('lib/')) &&
    fs.existsSync(path.resolve(ROOT, 'apps/web/src', ref))
  ) return true;
  // Schema paths without packages/shared/src/ prefix
  if (ref.startsWith('schemas/') && fs.existsSync(path.resolve(ROOT, 'packages/shared/src', ref))) return true;
  // API route paths without apps/api/src/ prefix
  if (ref.startsWith('routes/') && fs.existsSync(path.resolve(ROOT, 'apps/api/src', ref))) return true;
  // i18n locale files relative to apps/web/src/locales/
  if ((ref.startsWith('pt-BR/') || ref.startsWith('en/')) && fs.existsSync(path.resolve(ROOT, 'apps/web/src/locales', ref))) return true;
  return false;
}

function checkInternalLinks(filePath: string, content: string): Issue[] {
  const issues: Issue[] = [];
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(line)) !== null) {
      const link = match[2] as string;
      const resolved = resolveInternalLink(filePath, link);
      if (resolved && !fs.existsSync(resolved)) {
        issues.push({
          file: path.relative(ROOT, filePath),
          line: idx + 1,
          type: 'broken-link',
          value: link,
        });
      }
    }
  });

  return issues;
}

function checkCodeReferences(filePath: string, content: string): Issue[] {
  const issues: Issue[] = [];
  const lines = content.split('\n');

  const fileRefRegex = /`([\w/.-]+\.(ts|tsx|js|mjs|json|yml|yaml|toml))`/g;

  lines.forEach((line, idx) => {
    let match: RegExpExecArray | null;
    while ((match = fileRefRegex.exec(line)) !== null) {
      const ref = match[1] as string;
      // Skip absolute paths (HTTP routes like /.well-known/jwks.json)
      if (ref.startsWith('/')) continue;
      if (ref.includes('/') || ref.startsWith('apps/') || ref.startsWith('packages/') || ref.startsWith('scripts/')) {
        if (!fileExistsWithFallbacks(ref)) {
          issues.push({
            file: path.relative(ROOT, filePath),
            line: idx + 1,
            type: 'missing-code-ref',
            value: ref,
          });
        }
      }
    }
  });

  return issues;
}

async function main(): Promise<void> {
  const files: string[] = [];

  for (const pattern of DOC_GLOBS) {
    const matches = await glob(pattern, { cwd: ROOT, absolute: true });
    files.push(...matches.filter((f) => !shouldSkip(f)));
  }

  const uniqueFiles = [...new Set(files)];
  const allIssues: Issue[] = [];

  for (const filePath of uniqueFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    allIssues.push(...checkInternalLinks(filePath, content));
    allIssues.push(...checkCodeReferences(filePath, content));
  }

  if (allIssues.length === 0) {
    process.stdout.write(`✅ validate-docs: ${uniqueFiles.length} files checked — no issues found\n`);
    process.exit(0);
  }

  process.stderr.write(`❌ validate-docs: ${allIssues.length} issue(s) found in ${uniqueFiles.length} files:\n\n`);

  for (const issue of allIssues) {
    const label = issue.type === 'broken-link' ? '🔗 broken link' : '📄 missing code ref';
    process.stderr.write(`  ${label}  ${issue.file}:${issue.line}  → ${issue.value}\n`);
  }

  process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
