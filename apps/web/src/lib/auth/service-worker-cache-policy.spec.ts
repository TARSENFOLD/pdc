import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const serviceWorker = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');

describe('service worker private cache policy', () => {
  it('mantém todas as rotas API fora do Cache Storage', () => {
    expect(serviceWorker).toContain("url.pathname.startsWith('/api/')");
    expect(serviceWorker).toContain('event.respondWith(networkOnly(request))');
    expect(serviceWorker).not.toContain('networkFirst(request, CACHES.api)');
    expect(serviceWorker).not.toContain('api: `pdc-api-');
  });

  it('elimina caches API legados e aceita purge explícito', () => {
    expect(serviceWorker).toContain("key.startsWith('pdc-api-')");
    expect(serviceWorker).toContain("data.type === 'PURGE_PRIVATE_DATA'");
    expect(serviceWorker).toContain('event.waitUntil(purgePrivateData())');
  });

  it('não promete persistência de progresso em modo offline', () => {
    expect(serviceWorker).not.toContain('O teu progresso está guardado');
    expect(serviceWorker).toContain('não foi guardado');
  });
});
