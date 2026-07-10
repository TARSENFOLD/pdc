import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';

vi.mock('../lib/env.js', () => ({
  env: {
    WEB_PUSH_PUBLIC_KEY: 'test-public-vapid-key',
  },
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', { id: 'user-1', role: 'estudante', perfilId: 'perfil-1' });
    await next();
  },
}));

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn().mockResolvedValue({ data: { id: 'device-token-1' }, meta: {} }),
  strapiPut: vi.fn(),
}));

vi.mock('../modules/strapi/strapi-entity.js', () => ({
  findStrapiEntity: vi.fn(),
  persistedEntityId: vi.fn(),
}));

import { notificacaoRoutes } from './notificacoes.js';
import { strapiPost } from '../modules/strapi/strapi.client.js';
import { env } from '../lib/env.js';

describe('notificacaoRoutes — Web Push', () => {
  const app = new Hono().route('/notificacoes', notificacaoRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('expõe apenas a chave pública VAPID para utilizador autenticado', async () => {
    const res = await app.request('/notificacoes/push/public-key');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ publicKey: 'test-public-vapid-key' });
  });

  it('retorna 503 quando chave pública VAPID está ausente', async () => {
    const originalKey = env.WEB_PUSH_PUBLIC_KEY;
    env.WEB_PUSH_PUBLIC_KEY = '';

    const res = await app.request('/notificacoes/push/public-key');

    env.WEB_PUSH_PUBLIC_KEY = originalKey;
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: 'Web Push não configurado' });
  });

  it('regista subscription web normalizada como device-token', async () => {
    const res = await app.request('/notificacoes/push/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: 'https://push.example.com/sub/1',
        endpoint: 'https://push.example.com/sub/1',
        platform: 'web',
        p256dh: 'p256dh-key',
        auth: 'auth-secret',
      }),
    });

    expect(res.status).toBe(201);
    expect(strapiPost).toHaveBeenCalledWith('/device-tokens', expect.objectContaining({
      perfil: 'perfil-1',
      perfilId: 'perfil-1',
      platform: 'web',
      token: 'https://push.example.com/sub/1',
      endpoint: 'https://push.example.com/sub/1',
      p256dh: 'p256dh-key',
      auth: 'auth-secret',
    }));
  });
});