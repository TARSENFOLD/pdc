import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { interactionRoutes } from './interactions.js';
import { strapiDelete, strapiGet, strapiPost } from '../modules/strapi/strapi.client.js';
import type { StrapiListResponse, StrapiSingleResponse } from '@pdc/shared';
import type { InteractionPerfil } from '../modules/interactions/interaction-profile.js';
import type { StrapiInteractionEntity, StrapiShare } from './interactions.types.js';

const publishWithOutboxMock = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'evt-1' }));

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
  strapiDelete: vi.fn(),
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: { publishWithOutbox: publishWithOutboxMock },
}));

vi.mock('../middleware/rateLimit.js', () => ({
  rateLimitInteractions: async (_c: Context, next: Next) => { await next(); },
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', { id: 'user-1', role: 'estudante' });
    await next();
  },
}));

describe('interactionRoutes', () => {
  const app = new Hono().route('/interactions', interactionRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(strapiGet).mockResolvedValueOnce({
      data: [{ id: 7, documentId: 'perfil-doc-7', userId: 'user-1', nome: 'Ana' }],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
    } as StrapiListResponse<InteractionPerfil>);
  });

  it('cria like ligado ao perfil canónico', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce({
      data: [],
      meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
    });
    vi.mocked(strapiPost).mockResolvedValueOnce({
      data: { id: 1 },
      meta: {},
    });

    const response = await app.request('/interactions/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'post', targetId: 'post-1' }),
    });

    expect(response.status).toBe(200);
    expect(strapiPost).toHaveBeenCalledWith('/likes', expect.objectContaining({
      actor: 'perfil-doc-7',
      targetType: 'post',
      targetId: 'post-1',
    }));
    expect(publishWithOutboxMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ autorId: 'perfil-doc-7' }),
    );
  });

  it('cria bookmark ligado ao perfil canónico', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce({
      data: [],
      meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
    });
    vi.mocked(strapiPost).mockResolvedValueOnce({
      data: { id: 2 },
      meta: {},
    });

    const response = await app.request('/interactions/bookmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'post', targetId: 'post-1' }),
    });

    expect(response.status).toBe(200);
    expect(strapiPost).toHaveBeenCalledWith('/bookmarks', expect.objectContaining({
      actor: 'perfil-doc-7',
      targetType: 'post',
      targetId: 'post-1',
    }));
    expect(publishWithOutboxMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ autorId: 'perfil-doc-7' }),
    );
  });

  it('remove like existente em vez de criar duplicado', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce({
      data: [{ id: 4, documentId: 'like-doc-4', targetType: 'post', targetId: 'post-1' }],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
    } as StrapiListResponse<StrapiInteractionEntity>);

    const response = await app.request('/interactions/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'post', targetId: 'post-1' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ liked: false });
    expect(strapiDelete).toHaveBeenCalledWith('/likes/like-doc-4');
    expect(strapiPost).not.toHaveBeenCalled();
  });

  it('cria partilha interna e publica evento uma única vez', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 1, pageCount: 0, total: 0 } },
      } as StrapiListResponse<StrapiShare>)
      .mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 1, pageCount: 0, total: 1 } },
      });
    vi.mocked(strapiPost).mockResolvedValueOnce({
      data: {
        id: 9,
        documentId: 'share-doc-9',
        targetType: 'post',
        targetId: 'post-1',
        canal: 'interno',
      },
      meta: {},
    } as StrapiSingleResponse<StrapiShare>);

    const response = await app.request('/interactions/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'post', targetId: 'post-1', canal: 'interno' }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ shared: true, shareId: 'share-doc-9', count: 1 });
    expect(publishWithOutboxMock).toHaveBeenCalledTimes(1);
    expect(publishWithOutboxMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ autorId: 'perfil-doc-7' }),
    );
  });

  it('rejeita targetType inválido antes de consultar o Strapi', async () => {
    const response = await app.request('/interactions/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'desconhecido', targetId: 'post-1' }),
    });

    expect(response.status).toBe(400);
    expect(strapiPost).not.toHaveBeenCalled();
  });
});
