import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const publicPath = (...segments: string[]) => resolve(process.cwd(), 'public', ...segments);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

describe('PDC brand assets', () => {
  it('references only existing application icons', () => {
    const manifest: unknown = JSON.parse(readFileSync(publicPath('manifest.webmanifest'), 'utf8'));
    if (!isRecord(manifest) || !Array.isArray(manifest.icons)) {
      throw new Error('manifest.webmanifest must contain an icons array');
    }

    expect(manifest.icons).toHaveLength(2);
    for (const icon of manifest.icons) {
      if (!isRecord(icon) || typeof icon.src !== 'string') {
        throw new Error('Every manifest icon must define a string src');
      }
      expect(existsSync(publicPath(icon.src.replace(/^\//, '')))).toBe(true);
    }
  });

  it('uses detailed PDC artwork instead of the solid-colour placeholders', () => {
    expect(statSync(publicPath('icon-192.png')).size).toBeGreaterThan(5_000);
    expect(statSync(publicPath('icon-512.png')).size).toBeGreaterThan(20_000);
  });

  it('uses the published icon path for push notifications', () => {
    const serviceWorker = readFileSync(publicPath('sw.js'), 'utf8');
    const parsePushPayload: unknown = runInNewContext(`${serviceWorker}\nparsePushPayload;`, {
      self: { addEventListener: () => undefined },
    });
    if (typeof parsePushPayload !== 'function') {
      throw new Error('Service worker must expose parsePushPayload');
    }

    const result: unknown = Reflect.apply(parsePushPayload, undefined, [{ json: () => ({}) }]);
    if (!isRecord(result) || !isRecord(result.options)) {
      throw new Error('parsePushPayload must return notification options');
    }

    expect(result.options.icon).toBe('/icon-192.png');
    expect(result.options.badge).toBe('/icon-192.png');
  });
});
