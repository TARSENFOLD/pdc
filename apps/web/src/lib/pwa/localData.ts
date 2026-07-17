const PRIVATE_CACHE_PREFIXES = ['pdc-api-'] as const;
const PRIVATE_INDEXED_DB_NAMES = ['pdc-offline'] as const;

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

export interface DeleteDatabaseRequestLike {
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
  onblocked: (() => void) | null;
}

export interface PrivateDataCleanupEnvironment {
  cacheStorage?: {
    keys(): Promise<string[]>;
    delete(cacheName: string): Promise<boolean>;
  };
  indexedDb?: {
    deleteDatabase(databaseName: string): DeleteDatabaseRequestLike;
  };
  serviceWorker?: {
    controller?: MessageTargetLike | null;
    getRegistrations(): Promise<readonly ServiceWorkerRegistrationLike[]>;
  };
}

function browserCleanupEnvironment(): PrivateDataCleanupEnvironment {
  return {
    cacheStorage: typeof caches === 'undefined' ? undefined : caches,
    indexedDb:
      typeof indexedDB === 'undefined'
        ? undefined
        : (indexedDB as unknown as NonNullable<
            PrivateDataCleanupEnvironment['indexedDb']
          >),
    serviceWorker:
      typeof navigator === 'undefined' || !('serviceWorker' in navigator)
        ? undefined
        : navigator.serviceWorker,
  };
}

function deleteIndexedDbDatabase(
  indexedDb: NonNullable<PrivateDataCleanupEnvironment['indexedDb']>,
  databaseName: string,
): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDb.deleteDatabase(databaseName);
    request.onsuccess = resolve;
    request.onerror = resolve;
    // A controlled service worker may still have the database open. It also
    // receives PURGE_PRIVATE_DATA below and clears the sensitive store itself.
    request.onblocked = resolve;
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
  const registrations = await serviceWorker.getRegistrations();
  const workers = new Set<MessageTargetLike>();

  if (serviceWorker.controller) workers.add(serviceWorker.controller);
  for (const registration of registrations) {
    if (registration.active) workers.add(registration.active);
    if (registration.waiting) workers.add(registration.waiting);
    if (registration.installing) workers.add(registration.installing);
  }
  workers.forEach((worker) => worker.postMessage({ type: 'PURGE_PRIVATE_DATA' }));

  await Promise.allSettled(
    registrations.map(async (registration) => {
      const subscription = await registration.pushManager?.getSubscription();
      if (subscription) await subscription.unsubscribe();
    }),
  );
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
    tasks.push(
      ...PRIVATE_INDEXED_DB_NAMES.map((databaseName) =>
        deleteIndexedDbDatabase(environment.indexedDb!, databaseName),
      ),
    );
  }
  if (environment.serviceWorker) {
    tasks.push(purgeServiceWorkerState(environment.serviceWorker));
  }

  await Promise.allSettled(tasks);
}
