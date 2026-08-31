const PRIVATE_LOCAL_STORAGE_KEYS = [
  'pdc:auth-refresh-completed-at',
  'pdc:telemetry:circuit',
  'pdc:telemetry:pending',
] as const;

const PRIVATE_SESSION_STORAGE_KEYS = [
  'pdc:telemetry:sessionId',
] as const;

const LEGACY_PRIVATE_CACHE_PREFIX = 'pdc-api-';
const OFFLINE_DATABASE_NAME = 'pdc-offline';

function removeStorageKeys(storage: Storage, keys: readonly string[]): void {
  for (const key of keys) {
    try {
      storage.removeItem(key);
    } catch {
      // Restricted browser storage must not block logout.
    }
  }
}

async function deleteLegacyPrivateCaches(): Promise<void> {
  if (!('caches' in window)) return;
  try {
    const keys = await window.caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(LEGACY_PRIVATE_CACHE_PREFIX))
        .map((key) => window.caches.delete(key)),
    );
  } catch {
    // Cache Storage may be unavailable in hardened/private browser modes.
  }
}

function deleteOfflineDatabase(): Promise<void> {
  if (!('indexedDB' in window)) return Promise.resolve();
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.deleteDatabase(OFFLINE_DATABASE_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

function notifyServiceWorker(): void {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: 'PURGE_PRIVATE_DATA' });
  } catch {
    // Direct cleanup still runs when no active controller is available.
  }
}

export async function clearPrivateBrowserData(): Promise<void> {
  removeStorageKeys(window.localStorage, PRIVATE_LOCAL_STORAGE_KEYS);
  removeStorageKeys(window.sessionStorage, PRIVATE_SESSION_STORAGE_KEYS);
  notifyServiceWorker();
  await Promise.all([deleteLegacyPrivateCaches(), deleteOfflineDatabase()]);
}
