import webPush, { WebPushError } from 'web-push';
import pino from 'pino';
import {
  WebPushNotificationPayloadSchema,
  WebPushSubscriptionSchema,
  type WebPushNotificationPayload,
} from '@pdc/shared';
import { env } from '../../lib/env.js';
import { strapiDelete, strapiGet } from '../strapi/strapi.client.js';

const log = pino({ name: 'web-push-service' });
const WEB_PUSH_TIMEOUT_MS = 10_000;
let vapidConfigured = false;

interface DeviceTokenRecord {
  id: string | number;
  documentId?: string;
  perfil?: { id?: string | number } | null;
  perfilId: string;
  platform: 'web' | 'ios' | 'android';
  token: string;
  endpoint?: string | null;
  p256dh?: string | null;
  auth?: string | null;
}

export interface WebPushDeliverySummary {
  attempted: number;
  sent: number;
  failed: number;
  removedExpired: number;
}

function hasWebPushConfig(): boolean {
  return Boolean(env.WEB_PUSH_PUBLIC_KEY && env.WEB_PUSH_PRIVATE_KEY && env.WEB_PUSH_SUBJECT && vapidConfigured);
}

function configureVapid(): void {
  const subject = env.WEB_PUSH_SUBJECT;
  const publicKey = env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = env.WEB_PUSH_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    vapidConfigured = false;
    return;
  }
  try {
    webPush.setVapidDetails(
      subject,
      publicKey,
      privateKey,
    );
    vapidConfigured = true;
  } catch (err: unknown) {
    vapidConfigured = false;
    log.error({ err }, 'Configuração VAPID inválida; Web Push será desativado até correção do ambiente');
  }
}

function tokenId(record: DeviceTokenRecord): string {
  return record.documentId ?? String(record.id);
}

function isExpiredSubscriptionError(err: unknown): boolean {
  return err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410);
}

async function removeExpiredToken(record: DeviceTokenRecord): Promise<boolean> {
  try {
    await strapiDelete(`/device-tokens/${tokenId(record)}`);
    return true;
  } catch (err: unknown) {
    log.warn({ err, tokenId: tokenId(record) }, 'Falha ao remover Web Push subscription expirada');
    return false;
  }
}

function toSubscription(record: DeviceTokenRecord) {
  const endpoint = record.endpoint ?? record.token;
  const parsed = WebPushSubscriptionSchema.safeParse({
    endpoint,
    keys: {
      p256dh: record.p256dh,
      auth: record.auth,
    },
  });
  return parsed.success ? parsed.data : null;
}

async function getWebSubscriptions(perfilId: string): Promise<DeviceTokenRecord[]> {
  const subscriptions: DeviceTokenRecord[] = [];
  let page = 1;
  let pageCount = 1;

  do {
    const res = await strapiGet<DeviceTokenRecord>('/device-tokens', {
      'filters[$or][0][perfil][id][$eq]': perfilId,
      'filters[$or][1][perfilId][$eq]': perfilId,
      'filters[platform][$eq]': 'web',
      'pagination[page]': String(page),
      'pagination[pageSize]': '100',
    });
    subscriptions.push(...res.data);
    pageCount = res.meta.pagination.pageCount;
    page += 1;
  } while (page <= pageCount);

  return subscriptions;
}

configureVapid();

/**
 * Web Push Service (G14/G15)
 * Envia notificações reais para browsers desktop via Web Push API.
 */
export const webPushService = {
  async enviarNotificacao(perfilId: string, payload: WebPushNotificationPayload): Promise<WebPushDeliverySummary> {
    const parsedPayload = WebPushNotificationPayloadSchema.parse(payload);
    const summary: WebPushDeliverySummary = { attempted: 0, sent: 0, failed: 0, removedExpired: 0 };

    if (!hasWebPushConfig()) {
      log.warn({ perfilId }, 'Web Push não configurado; envio ignorado sem simular sucesso');
      return summary;
    }

    const tokens = await getWebSubscriptions(perfilId);
    const body = JSON.stringify(parsedPayload);

    for (const token of tokens) {
      const subscription = toSubscription(token);
      if (!subscription) {
        summary.failed += 1;
        log.warn({ perfilId, tokenId: tokenId(token) }, 'Web Push subscription inválida');
        continue;
      }

      summary.attempted += 1;
      try {
        await webPush.sendNotification(subscription, body, {
          TTL: 60 * 60,
          urgency: 'normal',
          timeout: WEB_PUSH_TIMEOUT_MS,
        });
        summary.sent += 1;
      } catch (err: unknown) {
        summary.failed += 1;
        if (isExpiredSubscriptionError(err)) {
          const removed = await removeExpiredToken(token);
          if (removed) summary.removedExpired += 1;
          continue;
        }
        log.warn({ err, perfilId, tokenId: tokenId(token) }, 'Falha ao enviar Web Push');
      }
    }

    return summary;
  },
};