/**
 * validate-docs.ts
 * CI gate: validates internal links and doc→code references in Markdown files.
 * Exit code 1 if any broken link or missing code reference is found.
 */

import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';

const ROOT = path.resolve(import.meta.dirname, '..');

const DOC_GLOBS = [
  'docs/**/*.md',
  '.planning/**/*.md',
  'specs/**/*.md',
  '*.md',
  'apps/*/README.md',
  'apps/web/DESIGN.md',
  'audit/**/*.md',
];

const SKIP_PATHS = [
  'docs/_archive',
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
  return path.resolve(dir, anchor);
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
      if (ref.includes('/') || ref.startsWith('apps/') || ref.startsWith('packages/') || ref.startsWith('scripts/')) {
        const resolved = path.resolve(ROOT, ref);
        if (!fs.existsSync(resolved)) {
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

await main();
