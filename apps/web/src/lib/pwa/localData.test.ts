import { describe, expect, it, vi } from 'vitest';
import {
  clearPrivateClientData,
  type PrivateDataCleanupEnvironment,
} from './localData';

describe('clearPrivateClientData', () => {
  it('removes only legacy private API caches', async () => {
    const deleteCache = vi.fn(async () => true);

    await clearPrivateClientData({
      cacheStorage: {
        keys: async () => ['pdc-api-pdc-v2.3', 'pdc-static-pdc-v2.3', 'other-cache'],
        delete: deleteCache,
      },
    });

    expect(deleteCache).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledWith('pdc-api-pdc-v2.3');
  });

  it('deletes the offline database and purges every worker generation', async () => {
    const postedMessages: unknown[] = [];
    const worker = { postMessage: (message: unknown) => postedMessages.push(message) };
    const unsubscribe = vi.fn(async () => true);
    const deletedDatabases: string[] = [];

    const environment: PrivateDataCleanupEnvironment = {
      indexedDb: {
        deleteDatabase: (databaseName) => {
          deletedDatabases.push(databaseName);
          const request = { onsuccess: null, onerror: null, onblocked: null };
          queueMicrotask(() => request.onsuccess?.());
          return request;
        },
      },
      serviceWorker: {
        controller: worker,
        getRegistrations: async () => [
          {
            active: worker,
            waiting: { postMessage: (message) => postedMessages.push(message) },
            pushManager: {
              getSubscription: async () => ({ unsubscribe }),
            },
          },
        ],
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

  it('does not reject logout when a browser cleanup API fails', async () => {
    await expect(
      clearPrivateClientData({
        cacheStorage: {
          keys: async () => {
            throw new Error('storage unavailable');
          },
          delete: async () => false,
        },
      }),
    ).resolves.toBeUndefined();
  });
});
