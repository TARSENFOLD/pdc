import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { disableWebPush, enableWebPush, getWebPushSupportStatus } from './webPushClient';
import { notificacoesApi } from '@/lib/api/notificacoes';

vi.mock('@/lib/api/notificacoes', () => ({
  notificacoesApi: {
    getPushPublicKey: vi.fn().mockResolvedValue({ publicKey: 'AQID' }),
    registerWebPush: vi.fn().mockResolvedValue({ data: { id: 'token-1' } }),
    unregisterWebPush: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

function makeSubscription(endpoint: string, applicationServerKey: ArrayBuffer | null = new Uint8Array([1, 2, 3]).buffer) {
  const unsubscribe = vi.fn().mockResolvedValue(true);
  const subscription: PushSubscription = {
    endpoint,
    expirationTime: null,
    options: { userVisibleOnly: true, applicationServerKey },
    getKey: vi.fn(),
    unsubscribe,
    toJSON: () => ({
      endpoint,
      keys: { p256dh: 'p256dh-key', auth: 'auth-secret' },
    }),
  };
  return { subscription, unsubscribe };
}

function installPushEnvironment(permission: NotificationPermission = 'default', existingSubscription: PushSubscription | null = null) {
  const subscribe = vi.fn().mockResolvedValue(makeSubscription('https://push.example.com/sub/1').subscription);
  const getSubscription = vi.fn().mockResolvedValue(existingSubscription);
  const ready = Promise.resolve({
    pushManager: { getSubscription, subscribe },
  });

  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: {
      get permission() { return permission; },
      requestPermission: vi.fn().mockResolvedValue('granted'),
    },
  });
  Object.defineProperty(window, 'PushManager', { configurable: true, value: function PushManager() {} });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready } });
  window.localStorage.clear();
  return { subscribe, getSubscription, existingSubscription };
}

function installLegacyPushEnvironment(permission: NotificationPermission = 'default') {
  const subscribe = vi.fn().mockResolvedValue({
    endpoint: 'https://push.example.com/sub/1',
    toJSON: () => ({
      endpoint: 'https://push.example.com/sub/1',
      keys: { p256dh: 'p256dh-key', auth: 'auth-secret' },
    }),
  });
  const getSubscription = vi.fn().mockResolvedValue(null);
  const ready = Promise.resolve({
    pushManager: { getSubscription, subscribe },
  });

  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: {
      get permission() { return permission; },
      requestPermission: vi.fn().mockResolvedValue('granted'),
    },
  });
  Object.defineProperty(window, 'PushManager', { configurable: true, value: function PushManager() {} });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready } });
  window.localStorage.clear();
  return { subscribe, getSubscription };
}

describe('webPushClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deteta suporte quando Notification/PushManager/SW existem', () => {
    installPushEnvironment();

    expect(getWebPushSupportStatus()).toBe('supported');
  });

  it('pede permissão, subscreve e regista no BFF', async () => {
    const { subscribe } = installPushEnvironment();

    const subscription = await enableWebPush();

    expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
    expect(subscription).toEqual({
      endpoint: 'https://push.example.com/sub/1',
      keys: { p256dh: 'p256dh-key', auth: 'auth-secret' },
    });
    expect(notificacoesApi.registerWebPush).toHaveBeenCalledWith(subscription);
  });

  it('reutiliza subscription existente quando a chave VAPID coincide', async () => {
    const existing = makeSubscription('https://push.example.com/sub/existing');
    const { subscribe } = installPushEnvironment('default', existing.subscription);

    const subscription = await enableWebPush();

    expect(subscribe).not.toHaveBeenCalled();
    expect(existing.unsubscribe).not.toHaveBeenCalled();
    expect(subscription.endpoint).toBe('https://push.example.com/sub/existing');
  });

  it('remove subscription existente quando a chave VAPID mudou', async () => {
    const existing = makeSubscription('https://push.example.com/sub/old', new Uint8Array([9, 9, 9]).buffer);
    const { subscribe } = installPushEnvironment('default', existing.subscription);

    await enableWebPush();

    expect(existing.unsubscribe).toHaveBeenCalled();
    expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
  });

  it('desativa Web Push removendo subscription e token no BFF', async () => {
    const existing = makeSubscription('https://push.example.com/sub/existing');
    installPushEnvironment('granted', existing.subscription);

    await disableWebPush();

    expect(existing.unsubscribe).toHaveBeenCalled();
    expect(notificacoesApi.unregisterWebPush).toHaveBeenCalledWith('https://push.example.com/sub/existing');
  });

  it('mantém compatibilidade com subscriptions antigas sem options', async () => {
    const { subscribe } = installLegacyPushEnvironment();

    await enableWebPush();

    expect(subscribe).toHaveBeenCalled();
  });
});