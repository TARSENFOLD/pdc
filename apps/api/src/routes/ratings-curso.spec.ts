import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { ratingRoutes } from './ratings.js';
import { strapiGet, strapiPost } from '../modules/strapi/strapi.client.js';
import type { StrapiListResponse, StrapiSingleResponse } from '@pdc/shared';

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
    publishWithOutbox: vi.fn().mockResolvedValue({ id: 'evt-1' }),
  },
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', { id: 'user-1', role: 'estudante', perfilId: 'perfil-1' });
    await next();
  },
}));

describe('ratingRoutes curso eligibility', () => {
  const app = new Hono().route('/ratings', ratingRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa /inscricoes e progressoPercentual para liberar avaliação de curso', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 'insc-1', progressoPercentual: 30 }]))
      .mockResolvedValueOnce(listResponse([{ id: 'perfil-1' }]))
      .mockResolvedValueOnce(listResponse([]));
    vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({ id: 'rating-1' }));

    const res = await app.request('/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'curso', targetId: 'curso-1', valor: 5 }),
    });

    expect(res.status).toBe(201);
    expect(strapiGet).toHaveBeenCalledWith('/inscricoes', expect.objectContaining({
      'filters[perfil][userId][$eq]': 'user-1',
      'filters[curso][id][$eq]': 'curso-1',
      'fields[0]': 'progressoPercentual',
    }));
    expect(strapiPost).toHaveBeenCalledWith('/ratings', expect.objectContaining({
      actor: 'perfil-1',
      targetType: 'curso',
      targetId: 'curso-1',
      estrelas: 5,
    }));
  });
});
