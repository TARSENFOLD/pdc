import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPrivateBrowserData } from './private-data-cleanup';

describe('clearPrivateBrowserData', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('remove dados privados, caches API legados e a fila IndexedDB', async () => {
    localStorage.setItem('pdc:telemetry:pending', '[{"eventId":"private"}]');
    localStorage.setItem('pdc:telemetry:circuit', '{"consecutiveFailures":1}');
    localStorage.setItem('pdc:theme', 'dark');
    sessionStorage.setItem('pdc:telemetry:sessionId', 'session-a');

    const cacheKeys = vi.fn().mockResolvedValue(['pdc-api-pdc-v2.3', 'pdc-static-pdc-v2.3']);
    const cacheDelete = vi.fn().mockResolvedValue(true);
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: { keys: cacheKeys, delete: cacheDelete },
    });

    const deleteDatabase = vi.fn(() => {
      const request = {} as IDBOpenDBRequest;
      queueMicrotask(() => {
        request.onsuccess?.call(request, new Event('success'));
      });
      return request;
    });
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: { deleteDatabase },
    });

    const postMessage = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { controller: { postMessage } },
    });

    await clearPrivateBrowserData();

    expect(localStorage.getItem('pdc:telemetry:pending')).toBeNull();
    expect(localStorage.getItem('pdc:telemetry:circuit')).toBeNull();
    expect(sessionStorage.getItem('pdc:telemetry:sessionId')).toBeNull();
    expect(localStorage.getItem('pdc:theme')).toBe('dark');
    expect(cacheDelete).toHaveBeenCalledWith('pdc-api-pdc-v2.3');
    expect(cacheDelete).not.toHaveBeenCalledWith('pdc-static-pdc-v2.3');
    expect(deleteDatabase).toHaveBeenCalledWith('pdc-offline');
    expect(postMessage).toHaveBeenCalledWith({ type: 'PURGE_PRIVATE_DATA' });
  });
});
