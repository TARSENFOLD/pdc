import { WebPushSubscriptionSchema, type WebPushSubscriptionPayload } from '@pdc/shared';
import { notificacoesApi } from '@/lib/api/notificacoes';

const WEB_PUSH_DISMISSED_KEY = 'pdc:web-push:dismissed';

export type WebPushSupportStatus = 'supported' | 'unsupported' | 'denied' | 'dismissed';

export function getWebPushSupportStatus(): WebPushSupportStatus {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  try {
    if (localStorage.getItem(WEB_PUSH_DISMISSED_KEY) === 'true') return 'dismissed';
  } catch {
    // localStorage indisponível; assume suportado
  }
  return 'supported';
}

export function dismissWebPushPrompt(): void {
  try {
    localStorage.setItem(WEB_PUSH_DISMISSED_KEY, 'true');
  } catch {
    // no-op se localStorage indisponível
  }
}

function urlBase64ToApplicationServerKey(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

function toUint8Array(buffer: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (ArrayBuffer.isView(buffer)) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  return new Uint8Array(buffer);
}

function bufferEquals(left: ArrayBuffer | ArrayBufferView, right: ArrayBuffer | ArrayBufferView): boolean {
  const a = toUint8Array(left);
  const b = toUint8Array(right);
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function resolveBrowserSubscription(registration: ServiceWorkerRegistration, publicKey: string): Promise<PushSubscription> {
  const expectedKey = urlBase64ToApplicationServerKey(publicKey);
  const existing = await registration.pushManager.getSubscription();
  const existingKey = existing?.options?.applicationServerKey;
  const keyMatches = existingKey ? bufferEquals(existingKey, expectedKey) : false;

  if (existing && !keyMatches) {
    await existing.unsubscribe();
  }

  if (existing && keyMatches) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: expectedKey,
  });
}

function parseSubscription(subscription: PushSubscription): WebPushSubscriptionPayload {
  const parsed = WebPushSubscriptionSchema.safeParse(subscription.toJSON());
  if (!parsed.success) {
    throw new Error('PushSubscription inválida devolvida pelo browser');
  }
  return parsed.data;
}

export async function enableWebPush(): Promise<WebPushSubscriptionPayload> {
  const support = getWebPushSupportStatus();
  if (support === 'unsupported') throw new Error('Este browser não suporta Web Push.');
  if (support === 'denied') throw new Error('Permissão de notificações bloqueada no browser.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permissão de notificações não concedida.');
  }

  const [{ publicKey }, registration] = await Promise.all([
    notificacoesApi.getPushPublicKey(),
    navigator.serviceWorker.ready,
  ]);

  const browserSubscription = await resolveBrowserSubscription(registration, publicKey);

  const subscription = parseSubscription(browserSubscription);
  await notificacoesApi.registerWebPush(subscription);
  try {
    localStorage.removeItem(WEB_PUSH_DISMISSED_KEY);
  } catch {
    // no-op se localStorage indisponível
  }
  return subscription;
}

export async function disableWebPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  let unregisterError: unknown;
  try {
    await notificacoesApi.unregisterWebPush(endpoint);
  } catch (error) {
    unregisterError = error;
  } finally {
    await subscription.unsubscribe();
  }
  if (unregisterError) {
    throw unregisterError instanceof Error
      ? unregisterError
      : new Error('Falha ao remover registo remoto de Web Push');
  }
}
