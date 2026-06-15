import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { commentsRoutes } from './comments.js';
import { strapiGet, strapiPost } from '../modules/strapi/strapi.client.js';
import type { StrapiListResponse, StrapiSingleResponse } from '@pdc/shared';
import type { InteractionPerfil } from '../modules/interactions/interaction-profile.js';

const publishWithOutboxMock = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'evt-comment-1' }));

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: {
    publishWithOutbox: publishWithOutboxMock,
  },
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', { id: 'user-1', role: 'estudante' });
    await next();
  },
}));

function singleResponse<T>(data: T & { id: string | number }): StrapiSingleResponse<T> {
  return { data, meta: {} };
}

describe('commentsRoutes', () => {
  const app = new Hono().route('/comments', commentsRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publica comentário ativo com a relação autor', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce({
      data: [{ id: 'perfil-1', documentId: 'perfil-doc-1', userId: 'user-1', nome: 'Ana' }],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
    } as StrapiListResponse<InteractionPerfil>);
    vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({
      id: 1,
      targetType: 'post',
      targetId: 'post-1',
      conteudo: 'Comentário útil para a comunidade.',
      estado: 'ativo',
      autor: { id: 'perfil-1', userId: 'user-1', nome: 'Ana' },
      createdAt: '2026-06-07T00:00:00.000Z',
    }));

    const response = await app.request('/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType: 'post',
        targetId: 'post-1',
        conteudo: 'Comentário útil para a comunidade.',
      }),
    });

    expect(response.status).toBe(201);
    expect(strapiPost).toHaveBeenCalledWith('/comments', expect.objectContaining({
      autor: 'perfil-doc-1',
      estado: 'ativo',
    }));
    expect(publishWithOutboxMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ autorId: 'perfil-doc-1' }),
    );
  });
});
