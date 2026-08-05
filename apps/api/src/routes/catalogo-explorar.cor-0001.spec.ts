import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { StrapiListResponse } from '@pdc/shared';
import { catalogoExplorarRoutes } from './catalogo-explorar.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
}));

vi.mock('../modules/feature-flags/feature-flags.service.js', () => ({
  featureFlagService: {
    isEnabled: vi.fn().mockResolvedValue(false),
  },
}));

function listResponse<T extends { id: string | number }>(data: T[]): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

describe('COR-0001 unified search', () => {
  it('não devolve resultados VWX', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([
      {
        id: 'exp-institucional',
        titulo: 'Experiência institucional',
        tipoExperiencia: 'institucional',
      },
      {
        id: 'exp-vwx',
        titulo: 'Experiência VWX',
        tipoExperiencia: 'vwx',
      },
    ]));
    const app = new Hono().route('/explorar', catalogoExplorarRoutes);

    const response = await app.request('/explorar?tipo=experiencia&search=experiencia');
    const body = await response.json() as { data: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(body.data.map((item) => item.id)).toEqual(['exp-institucional']);
    expect(strapiGet).toHaveBeenCalledWith('/experiencias', expect.objectContaining({
      status: 'published',
      'filters[estado][$eq]': 'approved',
    }));
  });

  it('não transforma falha do Strapi numa pesquisa vazia falsa', async () => {
    vi.mocked(strapiGet).mockRejectedValueOnce(new Error('Strapi indisponível'));
    const app = new Hono().route('/explorar', catalogoExplorarRoutes);

    const response = await app.request('/explorar?tipo=curso&search=engenharia');

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'O serviço de conteúdos está temporariamente indisponível.',
      code: 'DEPENDENCY_UNAVAILABLE',
    });
  });
});
