import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { feedPostRoutes } from './feed-posts.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { DomainEventName } from '../modules/events/types.js';
import type { StrapiListResponse, StrapiSingleResponse } from '@pdc/shared';

const publishWithOutboxMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

function listResponse<T>(data: Array<T & { id: string | number }>): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

function singleResponse<T>(data: T & { id: string | number }): StrapiSingleResponse<T> {
  return { data, meta: {} };
}

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
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

vi.mock('../modules/auth/rbac.middleware.js', () => ({
  checkRole: () => async (_c: Context, next: Next) => {
    await next();
  },
}));

describe('feedPostRoutes', () => {
  const app = new Hono().route('/feed-posts', feedPostRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
    publishWithOutboxMock.mockClear();
  });

  it('auto-aprova post normal e publica evento G15', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{
        id: 'perfil-1',
        userId: 'user-1',
        nome: 'Aluno Teste',
        createdAt: '2026-04-01T00:00:00.000Z',
        reputacao: 10,
      }]))
      .mockResolvedValueOnce(listResponse([]));

    vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({
      id: 'post-1',
      corpo: 'Partilhei uma experiência útil sobre cursos de tecnologia.',
      mediaUrls: [],
      estado: 'aprovada',
      eventId: 'event-1',
      likesCount: 0,
      comentariosCount: 0,
      createdAt: '2026-04-30T08:00:00.000Z',
      updatedAt: '2026-04-30T08:00:00.000Z',
    }));

    const res = await app.request('/feed-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ corpo: 'Partilhei uma experiência útil sobre cursos de tecnologia.', mediaUrls: [] }),
    });

    expect(res.status).toBe(201);
    expect(strapiPost).toHaveBeenCalledWith('/feed-posts', expect.objectContaining({
      estado: 'aprovada',
    }));
    expect(publishWithOutboxMock).toHaveBeenCalledWith(
      DomainEventName.POST_PUBLICADO,
      expect.objectContaining({
        postId: 'post-1',
        autorId: 'user-1',
      }),
      expect.any(String),
    );
  });

  it('envia post suspeito para revisão e publica evento de submissão', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{
        id: 'perfil-1',
        userId: 'user-1',
        nome: 'Aluno Teste',
        createdAt: '2026-04-01T00:00:00.000Z',
        reputacao: 10,
      }]))
      .mockResolvedValueOnce(listResponse([]));

    vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({
      id: 'post-2',
      corpo: 'Vejam http://bit.ly/oferta agora agora agora agora agora agora agora agora agora agora agora agora',
      mediaUrls: [],
      estado: 'pendente_moderacao',
      motivoModeracao: 'suspicious_link,repetitive_pattern',
      eventId: 'event-2',
      likesCount: 0,
      comentariosCount: 0,
      createdAt: '2026-04-30T08:00:00.000Z',
      updatedAt: '2026-04-30T08:00:00.000Z',
    }));

    const res = await app.request('/feed-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpo: 'Vejam http://bit.ly/oferta agora agora agora agora agora agora agora agora agora agora agora agora',
        mediaUrls: [],
      }),
    });

    expect(res.status).toBe(201);
    expect(strapiPost).toHaveBeenCalledWith('/feed-posts', expect.objectContaining({
      estado: 'pendente_moderacao',
    }));
    expect(publishWithOutboxMock).toHaveBeenCalledWith(
      DomainEventName.POST_SUBMETIDO,
      expect.objectContaining({
        postId: 'post-2',
        autorId: 'user-1',
        moderacaoRequerida: true,
      }),
      expect.any(String),
    );
  });

  it('publica evento quando moderador aprova post pendente', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
      id: 'post-3',
      documentId: 'doc-post-3',
      autor: { id: 'perfil-1', userId: 'user-1', nome: 'Aluno Teste' },
      corpo: 'Texto revisado',
      mediaUrls: [],
      estado: 'pendente_moderacao',
      createdAt: '2026-04-30T08:00:00.000Z',
      updatedAt: '2026-04-30T08:00:00.000Z',
    }]));

    vi.mocked(strapiPut).mockResolvedValueOnce(singleResponse({
      id: 'post-3',
      corpo: 'Texto revisado',
      mediaUrls: [],
      estado: 'aprovada',
      likesCount: 0,
      comentariosCount: 0,
      createdAt: '2026-04-30T08:00:00.000Z',
      updatedAt: '2026-04-30T08:10:00.000Z',
    }));

    const res = await app.request('/feed-posts/post-3/moderar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'aprovada' }),
    });

    expect(res.status).toBe(200);
    expect(strapiPut).toHaveBeenCalledWith('/feed-posts/doc-post-3', { estado: 'aprovada' });
    expect(publishWithOutboxMock).toHaveBeenCalledWith(
      DomainEventName.POST_PUBLICADO,
      expect.objectContaining({
        postId: 'post-3',
        autorId: 'user-1',
      }),
      expect.any(String),
    );
  });
});
