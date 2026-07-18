import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearPrivateClientData,
  type DeleteDatabaseCallbacks,
  type PrivateDataCleanupEnvironment,
} from './localData';

describe('clearPrivateClientData', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('removes only legacy private API caches', async () => {
    const deleteCache = vi.fn(() => Promise.resolve(true));

    await clearPrivateClientData({
      cacheStorage: {
        keys: () =>
          Promise.resolve(['pdc-api-pdc-v2.3', 'pdc-static-pdc-v2.3', 'other-cache']),
        delete: deleteCache,
      },
    });

    expect(deleteCache).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledWith('pdc-api-pdc-v2.3');
  });

  it('deletes the offline database and purges every worker generation', async () => {
    const postedMessages: unknown[] = [];
    const worker = { postMessage: (message: unknown) => postedMessages.push(message) };
    const unsubscribe = vi.fn(() => Promise.resolve(true));
    const deletedDatabases: string[] = [];

    const environment: PrivateDataCleanupEnvironment = {
      indexedDb: {
        deleteDatabase: (databaseName, callbacks) => {
          deletedDatabases.push(databaseName);
          queueMicrotask(() => {
            callbacks.onSuccess();
          });
        },
      },
      serviceWorker: {
        controller: worker,
        getRegistration: () =>
          Promise.resolve({
            active: worker,
            waiting: { postMessage: (message) => postedMessages.push(message) },
            pushManager: {
              getSubscription: () => Promise.resolve({ unsubscribe }),
            },
          }),
      },
    };

    await clearPrivateClientData(environment);

    expect(deletedDatabases).toEqual(['pdc-offline']);
    expect(postedMessages).toEqual([
      { type: 'PURGE_PRIVATE_DATA' },
      { type: 'PURGE_PRIVATE_DATA' },
    ]);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('does not report a blocked IndexedDB deletion as completed', async () => {
    vi.useFakeTimers();
    let callbacks: DeleteDatabaseCallbacks | undefined;
    const cleanup = clearPrivateClientData({
      indexedDb: {
        deleteDatabase: (_databaseName, deletionCallbacks) => {
          callbacks = deletionCallbacks;
          deletionCallbacks.onBlocked();
        },
      },
    });
    let completed = false;
    void cleanup.then(() => {
      completed = true;
    });

    await vi.advanceTimersByTimeAsync(1_499);
    expect(completed).toBe(false);
    callbacks?.onSuccess();
    await cleanup;
    expect(completed).toBe(true);
  });

  it('bounds a permanently blocked IndexedDB deletion', async () => {
    vi.useFakeTimers();
    const cleanup = clearPrivateClientData({
      indexedDb: {
        deleteDatabase: (_databaseName, callbacks) => {
          callbacks.onBlocked();
        },
      },
    });

    await vi.advanceTimersByTimeAsync(1_500);
    await expect(cleanup).resolves.toBeUndefined();
  });

  it('does not reject logout when a browser cleanup API fails', async () => {
    const deleteDatabase = vi.fn(
      (_databaseName: string, callbacks: DeleteDatabaseCallbacks) => {
        callbacks.onSuccess();
      },
    );

    await expect(
      clearPrivateClientData({
        cacheStorage: {
          keys: () => Promise.reject(new Error('storage unavailable')),
          delete: () => Promise.resolve(false),
        },
        indexedDb: { deleteDatabase },
      }),
    ).resolves.toBeUndefined();
    expect(deleteDatabase).toHaveBeenCalledWith('pdc-offline', expect.any(Object));
  });
});
