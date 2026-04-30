import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Resolve src/index.ts regardless of whether we run from src/ or dist/
const pkgRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const indexPath = new URL(pathToFileURL(path.join(pkgRoot, 'src', 'index.ts')).href);
const source = fs.readFileSync(indexPath, 'utf8');

const reExportTargets = source
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith("export * from './"))
  .map((line) => {
    const match = line.match(/export \* from '(\.\/.+)\.js';/);
    if (!match) {
      throw new Error(`Linha de re-export inválida em index.ts: ${line}`);
    }
    const captured = match[1];
    if (!captured) throw new Error(`Re-export sem caminho em index.ts: ${line}`);
    return captured;
  });

function resolveSourcePath(targetWithoutJs: string): string {
  const baseDir = path.dirname(indexPath.pathname);
  const tsPath = path.resolve(baseDir, `${targetWithoutJs}.ts`);
  const tsxPath = path.resolve(baseDir, `${targetWithoutJs}.tsx`);
  return fs.existsSync(tsPath) ? tsPath : tsxPath;
}

function hasAnySourceExport(sourcePath: string): boolean {
  const fileSource = fs.readFileSync(sourcePath, 'utf8');
  return /\bexport\s+(type\s+)?(?:\*|\{|\w|interface|enum|class|const|function)/.test(fileSource);
}

describe('Shared index.ts contract', () => {
  it('cada re-export aponta para ficheiro existente com export(s) concretos', async () => {
    for (const target of reExportTargets) {
      const sourcePath = resolveSourcePath(target);
      expect(
        fs.existsSync(sourcePath),
        `Re-export aponta para ficheiro inexistente: ${target}.js`,
      ).toBe(true);

      const moduleNs = (await import(pathToFileURL(sourcePath).href)) as Record<string, unknown>;
      const exportedKeys = Object.keys(moduleNs).filter((key) => key !== 'default');
      const hasSourceExport = hasAnySourceExport(sourcePath);
      expect(
        exportedKeys.length > 0 || hasSourceExport,
        `Ficheiro re-exportado sem símbolos exportados: ${target}.js`,
      ).toBe(true);
    }
  });

  it('não há colisões de símbolos entre módulos re-exportados', async () => {
    const symbolToOrigin = new Map<string, { module: string; value: unknown }>();
    const collisions: string[] = [];

    for (const target of reExportTargets) {
      const sourcePath = resolveSourcePath(target);
      const moduleNs = (await import(pathToFileURL(sourcePath).href)) as Record<string, unknown>;
      const exportedKeys = Object.keys(moduleNs).filter((key) => key !== 'default');

      for (const key of exportedKeys) {
        const existing = symbolToOrigin.get(key);
        const currentValue = moduleNs[key];
        if (existing && existing.module !== target && existing.value !== currentValue) {
          collisions.push(`${key} (${existing.module}.js <-> ${target}.js)`);
          continue;
        }
        symbolToOrigin.set(key, { module: target, value: currentValue });
      }
    }

    expect(collisions, `Colisões de símbolos detectadas: ${collisions.join(', ')}`).toEqual([]);
  });
});
