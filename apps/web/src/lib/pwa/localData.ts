const PRIVATE_CACHE_PREFIXES = ['pdc-api-'] as const;
const PRIVATE_INDEXED_DB_NAMES = ['pdc-offline'] as const;
const INDEXED_DB_DELETE_TIMEOUT_MS = 1_500;

interface MessageTargetLike {
  postMessage(message: unknown): void;
}

interface PushSubscriptionLike {
  unsubscribe(): Promise<boolean>;
}

interface ServiceWorkerRegistrationLike {
  active?: MessageTargetLike | null;
  waiting?: MessageTargetLike | null;
  installing?: MessageTargetLike | null;
  pushManager?: {
    getSubscription(): Promise<PushSubscriptionLike | null>;
  };
}

export interface DeleteDatabaseCallbacks {
  onSuccess(): void;
  onError(): void;
  onBlocked(): void;
}

export interface PrivateDataCleanupEnvironment {
  cacheStorage?: {
    keys(): Promise<string[]>;
    delete(cacheName: string): Promise<boolean>;
  } | undefined;
  indexedDb?: {
    deleteDatabase(
      databaseName: string,
      callbacks: DeleteDatabaseCallbacks,
    ): void;
  } | undefined;
  serviceWorker?: {
    controller?: MessageTargetLike | null;
    getRegistration(): Promise<ServiceWorkerRegistrationLike | undefined>;
  } | undefined;
}

function browserCleanupEnvironment(): PrivateDataCleanupEnvironment {
  return {
    cacheStorage: typeof caches === 'undefined' ? undefined : caches,
    indexedDb:
      typeof indexedDB === 'undefined'
        ? undefined
        : {
            deleteDatabase: (databaseName, callbacks) => {
              const request = indexedDB.deleteDatabase(databaseName);
              request.onsuccess = () => callbacks.onSuccess();
              request.onerror = () => callbacks.onError();
              request.onblocked = () => callbacks.onBlocked();
            },
          },
    serviceWorker:
      typeof navigator === 'undefined' || !('serviceWorker' in navigator)
        ? undefined
        : {
            controller: navigator.serviceWorker.controller,
            getRegistration: () => navigator.serviceWorker.getRegistration(),
          },
  };
}

function deleteIndexedDbDatabase(
  indexedDb: NonNullable<PrivateDataCleanupEnvironment['indexedDb']>,
  databaseName: string,
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const timeoutId = globalThis.setTimeout(() => {
      settled = true;
      resolve();
    }, INDEXED_DB_DELETE_TIMEOUT_MS);
    const settle = (): void => {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(timeoutId);
      resolve();
    };

    indexedDb.deleteDatabase(databaseName, {
      onSuccess: settle,
      onError: settle,
      // A blocked event only means another context still has the database
      // open. It is not evidence that deletion completed.
      onBlocked: () => undefined,
    });
  });
}

async function purgePrivateCaches(
  cacheStorage: NonNullable<PrivateDataCleanupEnvironment['cacheStorage']>,
): Promise<void> {
  const cacheNames = await cacheStorage.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) =>
        PRIVATE_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix)),
      )
      .map((cacheName) => cacheStorage.delete(cacheName)),
  );
}

async function purgeServiceWorkerState(
  serviceWorker: NonNullable<PrivateDataCleanupEnvironment['serviceWorker']>,
): Promise<void> {
  const registration = await serviceWorker.getRegistration();
  const workers = new Set<MessageTargetLike>();

  if (serviceWorker.controller) workers.add(serviceWorker.controller);
  if (registration) {
    if (registration.active) workers.add(registration.active);
    if (registration.waiting) workers.add(registration.waiting);
    if (registration.installing) workers.add(registration.installing);
  }
  workers.forEach((worker) => worker.postMessage({ type: 'PURGE_PRIVATE_DATA' }));

  const subscription = await registration?.pushManager?.getSubscription();
  if (subscription) await subscription.unsubscribe();
}

/**
 * Removes client-side state that can be associated with the authenticated user.
 * The operation is deliberately idempotent and best-effort so logout cannot be
 * blocked by a restricted browser API.
 */
export async function clearPrivateClientData(
  environment: PrivateDataCleanupEnvironment = browserCleanupEnvironment(),
): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  if (environment.cacheStorage) {
    tasks.push(purgePrivateCaches(environment.cacheStorage));
  }
  if (environment.indexedDb) {
    const indexedDb = environment.indexedDb;
    tasks.push(
      ...PRIVATE_INDEXED_DB_NAMES.map((databaseName) =>
        deleteIndexedDbDatabase(indexedDb, databaseName),
      ),
    );
  }
  if (environment.serviceWorker) {
    tasks.push(purgeServiceWorkerState(environment.serviceWorker));
  }

  await Promise.allSettled(tasks);
}
