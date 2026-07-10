import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StrapiListResponse } from '@pdc/shared';
import webPush, { WebPushError } from 'web-push';
import { strapiDelete, strapiGet } from '../strapi/strapi.client.js';

interface TestDeviceTokenRecord {
  id: string | number;
  documentId?: string;
  perfilId: string;
  platform: 'web' | 'ios' | 'android';
  token: string;
  endpoint?: string | null;
  p256dh?: string | null;
  auth?: string | null;
}

vi.mock('../../lib/env.js', () => ({
  env: {
    WEB_PUSH_PUBLIC_KEY: 'public-key',
    WEB_PUSH_PRIVATE_KEY: 'private-key',
    WEB_PUSH_SUBJECT: 'mailto:ops@usepdc.com',
  },
}));

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({ statusCode: 201, body: '', headers: {} }),
  },
  WebPushError: class WebPushError extends Error {
    readonly statusCode: number;
    readonly headers: Record<string, string>;
    readonly body: string;
    readonly endpoint: string;

    constructor(message: string, statusCode: number, headers: Record<string, string>, body: string, endpoint: string) {
      super(message);
      this.statusCode = statusCode;
      this.headers = headers;
      this.body = body;
      this.endpoint = endpoint;
    }
  },
}));

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiDelete: vi.fn().mockResolvedValue({ data: { id: 'deleted' }, meta: {} }),
}));

function listResponse<T extends { id: string | number }>(data: T[]): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

describe('webPushService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock('../../lib/env.js', () => ({
      env: {
        WEB_PUSH_PUBLIC_KEY: 'public-key',
        WEB_PUSH_PRIVATE_KEY: 'private-key',
        WEB_PUSH_SUBJECT: 'mailto:ops@usepdc.com',
      },
    }));
    vi.mocked(webPush.sendNotification).mockResolvedValue({ statusCode: 201, body: '', headers: {} });
    // Garante um módulo fresco ligado ao vi.mock(env) deste ficheiro, evitando
    // contaminação por cache de import entre ficheiros no mesmo worker vitest
    // (o side-effect top-level configureVapid() deve correr com o env mockado correcto).
    vi.resetModules();
  });

  it('configura VAPID e envia para subscriptions web persistidas', async () => {
    const { webPushService } = await import('./web-push.service.js');
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
      id: 'token-1',
      perfilId: 'perfil-1',
      platform: 'web' as const,
      token: 'https://push.example.com/sub/1',
      endpoint: 'https://push.example.com/sub/1',
      p256dh: 'p256dh-key',
      auth: 'auth-secret',
    }]));

    const result = await webPushService.enviarNotificacao('perfil-1', {
      title: 'Conquista',
      body: 'Ganhaste uma conquista',
      tag: 'evt-1',
    });

    expect(webPush.setVapidDetails).toHaveBeenCalledWith('mailto:ops@usepdc.com', 'public-key', 'private-key');
    expect(strapiGet).toHaveBeenCalledWith('/device-tokens', expect.objectContaining({
      'filters[$or][0][perfil][id][$eq]': 'perfil-1',
      'filters[$or][1][perfilId][$eq]': 'perfil-1',
      'filters[platform][$eq]': 'web',
    }));
    expect(webPush.sendNotification).toHaveBeenCalledWith(
      {
        endpoint: 'https://push.example.com/sub/1',
        keys: { p256dh: 'p256dh-key', auth: 'auth-secret' },
      },
      JSON.stringify({ title: 'Conquista', body: 'Ganhaste uma conquista', tag: 'evt-1' }),
      expect.objectContaining({ TTL: 3600, urgency: 'normal' }),
    );
    expect(result).toEqual({ attempted: 1, sent: 1, failed: 0, removedExpired: 0 });
  });

  it('pagina todas as subscriptions web antes de enviar', async () => {
    const { webPushService } = await import('./web-push.service.js');
    const firstPage: TestDeviceTokenRecord[] = [{
      id: 'token-1',
      perfilId: 'perfil-1',
      platform: 'web',
      token: 'https://push.example.com/sub/1',
      endpoint: 'https://push.example.com/sub/1',
      p256dh: 'p256dh-key',
      auth: 'auth-secret',
    }];
    const secondPage: TestDeviceTokenRecord[] = [{
      id: 'token-2',
      perfilId: 'perfil-1',
      platform: 'web',
      token: 'https://push.example.com/sub/2',
      endpoint: 'https://push.example.com/sub/2',
      p256dh: 'p256dh-key',
      auth: 'auth-secret',
    }];
    vi.mocked(strapiGet)
      .mockResolvedValueOnce({
        data: firstPage,
        meta: { pagination: { page: 1, pageSize: 1, pageCount: 2, total: 2 } },
      })
      .mockResolvedValueOnce({
        data: secondPage,
        meta: { pagination: { page: 2, pageSize: 1, pageCount: 2, total: 2 } },
      });

    const result = await webPushService.enviarNotificacao('perfil-1', { title: 'Aviso', body: 'Mensagem' });

    expect(strapiGet).toHaveBeenCalledTimes(2);
    expect(strapiGet).toHaveBeenNthCalledWith(1, '/device-tokens', expect.objectContaining({ 'pagination[page]': '1' }));
    expect(strapiGet).toHaveBeenNthCalledWith(2, '/device-tokens', expect.objectContaining({ 'pagination[page]': '2' }));
    expect(result.attempted).toBe(2);
    expect(result.sent).toBe(2);
  });

  it('remove subscriptions expiradas quando push service devolve 410', async () => {
    const { webPushService } = await import('./web-push.service.js');
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
      id: 7,
      documentId: 'doc-token-7',
      perfilId: 'perfil-1',
      platform: 'web' as const,
      token: 'https://push.example.com/sub/expired',
      endpoint: 'https://push.example.com/sub/expired',
      p256dh: 'p256dh-key',
      auth: 'auth-secret',
    }]));
    vi.mocked(webPush.sendNotification).mockRejectedValueOnce(
      new WebPushError('expired', 410, {}, '', 'https://push.example.com/sub/expired'),
    );

    const result = await webPushService.enviarNotificacao('perfil-1', {
      title: 'Aviso',
      body: 'Mensagem',
    });

    expect(strapiDelete).toHaveBeenCalledWith('/device-tokens/doc-token-7');
    expect(result).toEqual({ attempted: 1, sent: 0, failed: 1, removedExpired: 1 });
  });

  it('mantém subscription em falha transitória (não expirada)', async () => {
    const { webPushService } = await import('./web-push.service.js');
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
      id: 'token-1',
      perfilId: 'perfil-1',
      platform: 'web' as const,
      token: 'https://push.example.com/sub/1',
      endpoint: 'https://push.example.com/sub/1',
      p256dh: 'p256dh-key',
      auth: 'auth-secret',
    }]));
    vi.mocked(webPush.sendNotification).mockRejectedValueOnce(
      new WebPushError('server error', 500, {}, '', 'https://push.example.com/sub/1'),
    );

    const result = await webPushService.enviarNotificacao('perfil-1', { title: 'Aviso', body: 'Mensagem' });

    expect(strapiDelete).not.toHaveBeenCalled();
    expect(result).toEqual({ attempted: 1, sent: 0, failed: 1, removedExpired: 0 });
  });

  it('não simula sucesso para subscription inválida', async () => {
    const { webPushService } = await import('./web-push.service.js');
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
      id: 'token-invalid',
      perfilId: 'perfil-1',
      platform: 'web' as const,
      token: 'not-a-url',
      endpoint: 'not-a-url',
      p256dh: null,
      auth: null,
    }]));

    const result = await webPushService.enviarNotificacao('perfil-1', {
      title: 'Aviso',
      body: 'Mensagem',
    });

    expect(webPush.sendNotification).not.toHaveBeenCalled();
    expect(result).toEqual({ attempted: 0, sent: 0, failed: 1, removedExpired: 0 });
  });

  it('retorna summary zerado quando Web Push não está configurado', async () => {
    vi.resetModules();
    vi.doMock('../../lib/env.js', () => ({ env: {} }));
    const { webPushService } = await import('./web-push.service.js');

    const result = await webPushService.enviarNotificacao('perfil-1', { title: 'Aviso', body: 'Mensagem' });

    expect(strapiGet).not.toHaveBeenCalled();
    expect(webPush.sendNotification).not.toHaveBeenCalled();
    expect(result).toEqual({ attempted: 0, sent: 0, failed: 0, removedExpired: 0 });
  });

  it('não derruba o import quando VAPID está mal configurado', async () => {
    vi.resetModules();
    vi.doMock('../../lib/env.js', () => ({
      env: {
        WEB_PUSH_PUBLIC_KEY: 'bad-public-key',
        WEB_PUSH_PRIVATE_KEY: 'bad-private-key',
        WEB_PUSH_SUBJECT: 'mailto:ops@usepdc.com',
      },
    }));
    vi.mocked(webPush.setVapidDetails).mockImplementationOnce(() => { throw new Error('bad vapid'); });

    const { webPushService } = await import('./web-push.service.js');
    const result = await webPushService.enviarNotificacao('perfil-1', { title: 'Aviso', body: 'Mensagem' });

    expect(strapiGet).not.toHaveBeenCalled();
    expect(webPush.sendNotification).not.toHaveBeenCalled();
    expect(result).toEqual({ attempted: 0, sent: 0, failed: 0, removedExpired: 0 });
  });
});
