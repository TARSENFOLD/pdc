import { beforeEach, describe, expect, it, vi } from 'vitest';

const render = vi.hoisted(() => vi.fn());

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: () => ({ render }),
  },
}));

document.body.innerHTML = '<div id="root"></div>';
const { cleanupServiceWorkersBeforeBootstrap } = await import('./main');

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe('cleanupServiceWorkersBeforeBootstrap', () => {
  it('requests exactly one reload after removing a controlling registration', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([{ unregister }]);

    await expect(
      cleanupServiceWorkersBeforeBootstrap(true, getRegistrations, window.localStorage),
    ).resolves.toBe('reload');
    await expect(
      cleanupServiceWorkersBeforeBootstrap(true, getRegistrations, window.localStorage),
    ).resolves.toBe('continue');

    expect(unregister).toHaveBeenCalledOnce();
  });

  it('continues without a reload when the page was not controlled', async () => {
    const unregister = vi.fn().mockResolvedValue(true);

    await expect(
      cleanupServiceWorkersBeforeBootstrap(
        false,
        () => Promise.resolve([{ unregister }]),
        window.localStorage,
      ),
    ).resolves.toBe('continue');

    expect(unregister).toHaveBeenCalledOnce();
  });

  it('continues when registrations cannot be queried', async () => {
    await expect(
      cleanupServiceWorkersBeforeBootstrap(
        true,
        () => Promise.reject(new Error('Service Worker API unavailable')),
        window.localStorage,
      ),
    ).resolves.toBe('continue');
  });

  it('continues when no registration is removed', async () => {
    const unregister = vi.fn().mockResolvedValue(false);

    await expect(
      cleanupServiceWorkersBeforeBootstrap(
        true,
        () => Promise.resolve([{ unregister }]),
        window.localStorage,
      ),
    ).resolves.toBe('continue');

    await cleanupServiceWorkersBeforeBootstrap(
      true,
      () => Promise.resolve([{ unregister }]),
      window.localStorage,
    );
    expect(unregister).toHaveBeenCalledTimes(2);
  });

  it('continues when persistent storage is unavailable', async () => {
    const storageError = new Error('Storage disabled');
    const unavailableStorage = {
      getItem: () => {
        throw storageError;
      },
      setItem: () => {
        throw storageError;
      },
      removeItem: () => {
        throw storageError;
      },
    };

    await expect(
      cleanupServiceWorkersBeforeBootstrap(
        true,
        () => Promise.resolve([{ unregister: () => Promise.resolve(true) }]),
        unavailableStorage,
      ),
    ).resolves.toBe('continue');
  });
});
