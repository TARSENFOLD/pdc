import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { feedRoutes } from './feed.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { redis } from '../lib/redis.js';
import type { StrapiListResponse } from '@pdc/shared';
import { featureFlagService } from '../modules/feature-flags/feature-flags.service.js';

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
}));

vi.mock('../lib/redis.js', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  },
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', { id: 'user-1', role: 'estudante', perfilId: 'perfil-1' });
    await next();
  },
}));

vi.mock('../modules/auth/rbac.middleware.js', () => ({
  checkRole: () => async (_c: Context, next: Next) => {
    await next();
  },
}));

vi.mock('../modules/feed/feed.weights.js', () => ({
  getWeights: vi.fn().mockResolvedValue({ engagement: 0.3, completion: 0.1, rating: 0.2, recency: 0.2, reputation: 0.1, affinity: 0.05, time: 0.05 }),
  setWeights: vi.fn(),
}));

vi.mock('../modules/feature-flags/feature-flags.service.js', () => ({
  featureFlagService: {
    isEnabled: vi.fn(),
  },
}));

function listResponse<T>(data: Array<T & { id: string | number }>): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

describe('feedRoutes', () => {
  const app = new Hono().route('/feed', feedRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(redis.set).mockResolvedValue('OK');
    vi.mocked(featureFlagService.isEnabled).mockResolvedValue(true);
  });

  it('lê /feed/geral a partir de feed-entries quando collection tem dados', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{
        id: 'entry-1',
        entityType: 'curso',
        entityId: 'curso-1',
        autorId: 'perfil-autor-1',
        titulo: 'Curso em destaque',
        corpo: 'Conteúdo agregado pelo hook de feed.',
        area: 'TECNOLOGIA',
        source: 'geral',
        score: 0.91,
        eventId: 'event-1',
        publicadoEm: '2026-07-05T12:00:00.000Z',
      }]))
      .mockResolvedValueOnce(listResponse([{ id: 'curso-1' }]));

    const res = await app.request('/feed/geral');

    expect(res.status).toBe(200);
    expect(strapiGet).toHaveBeenCalledWith('/feed-entries', expect.objectContaining({
      'filters[source][$eq]': 'geral',
    }));
    await expect(res.json()).resolves.toMatchObject({
      data: [{ id: 'curso-1', tipo: 'curso', source: 'geral', titulo: 'Curso em destaque' }],
      meta: { total: 1, fromFeedEntries: true },
    });
    expect(redis.set).toHaveBeenCalledWith('feed:geral:all', expect.any(Object), { ex: 300 });
  });

  it('usa cache Redis antes de consultar feed-entries', async () => {
    vi.mocked(redis.get).mockResolvedValueOnce({
      data: [{ id: 'post-1', tipo: 'post', titulo: 'Cache', userId: 'perfil-1', createdAt: '2026-07-05T12:00:00.000Z' }],
      meta: { total: 1, fromFeedEntries: true },
    });

    const res = await app.request('/feed/geral');

    expect(res.status).toBe(200);
    expect(strapiGet).not.toHaveBeenCalled();
  });

  it('lê /feed/vocacional a partir de feed-entries filtradas por área', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 'voc-1', areaMatch: 'TECNOLOGIA' }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'entry-voc-1',
        entityType: 'curso',
        entityId: 'curso-tech-1',
        autorId: 'perfil-autor-1',
        titulo: 'Curso Tech',
        area: 'TECNOLOGIA',
        source: 'vocacional',
        score: 0.9,
        eventId: 'event-voc-1',
        publicadoEm: '2026-07-05T12:00:00.000Z',
      }]))
      .mockResolvedValueOnce(listResponse([{ id: 'curso-tech-1' }]));

    const res = await app.request('/feed/vocacional');

    expect(res.status).toBe(200);
    expect(strapiGet).toHaveBeenCalledWith('/feed-entries', expect.objectContaining({
      'filters[source][$eq]': 'vocacional',
      'filters[area][$eq]': 'TECNOLOGIA',
    }));
    expect(redis.set).toHaveBeenCalledWith('feed:vocacional:TECNOLOGIA', expect.any(Object), { ex: 300 });
  });

  it('isola cache institucional por instituição do utilizador', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 'perfil-1', instituicao: { id: 'inst-1', nome: 'Instituição A' } }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'entry-inst-1',
        entityType: 'experiencia',
        entityId: 'exp-inst-1',
        autorId: 'perfil-inst',
        titulo: 'Experiência Institucional',
        source: 'institucional',
        instituicaoId: 'inst-1',
        score: 0.95,
        eventId: 'event-inst-1',
        publicadoEm: '2026-07-05T12:00:00.000Z',
      }]))
      .mockResolvedValueOnce(listResponse([{ id: 'exp-inst-1' }]));

    const res = await app.request('/feed/institucional');

    expect(res.status).toBe(200);
    expect(strapiGet).toHaveBeenCalledWith('/feed-entries', expect.objectContaining({
      'filters[source][$eq]': 'institucional',
      'filters[instituicaoId][$eq]': 'inst-1',
    }));
    expect(redis.set).toHaveBeenCalledWith('feed:institucional:inst-1', expect.any(Object), { ex: 300 });
  });

  it('remove uma experiência VWX das feed-entries canónicas', async () => {
    vi.mocked(featureFlagService.isEnabled).mockResolvedValue(false);
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{
        id: 'entry-vwx',
        entityType: 'experiencia',
        entityId: 'doc-vwx',
        titulo: 'VWX',
        source: 'geral',
        publicadoEm: '2026-07-30T10:00:00.000Z',
      }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'exp-vwx',
        documentId: 'doc-vwx',
        tipoExperiencia: 'vwx',
      }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'exp-vwx',
        documentId: 'doc-vwx',
        tipoExperiencia: 'vwx',
      }]));

    const res = await app.request('/feed/geral');

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: [] });
  });

  it('não confia num item governado presente apenas no cache', async () => {
    vi.mocked(redis.get).mockResolvedValueOnce({
      data: [{
        id: 'curso-oculto',
        tipo: 'curso',
        titulo: 'Curso ocultado',
        userId: 'author-1',
        createdAt: '2026-07-05T12:00:00.000Z',
      }],
      meta: { total: 1, fromFeedEntries: true },
    });
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([]));

    const res = await app.request('/feed/geral');

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: [], meta: { total: 0 } });
  });

  it('falha de revalidação autoritativa do cache devolve DEPENDENCY_UNAVAILABLE', async () => {
    vi.mocked(redis.get).mockResolvedValueOnce({
      data: [{
        id: 'curso-1',
        tipo: 'curso',
        titulo: 'Curso',
        userId: 'author-1',
        createdAt: '2026-07-05T12:00:00.000Z',
      }],
      meta: { total: 1, fromFeedEntries: true },
    });
    vi.mocked(strapiGet).mockRejectedValueOnce(new Error('Strapi indisponível'));

    const res = await app.request('/feed/geral');

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: 'O serviço de conteúdos está temporariamente indisponível.',
      code: 'DEPENDENCY_UNAVAILABLE',
    });
  });
});
