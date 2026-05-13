import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import type { StrapiListResponse } from '@pdc/shared';
import { catalogoRoutes } from './catalogo.js';
import { strapiGet, strapiGetRaw } from '../modules/strapi/strapi.client.js';

function listResponse<T>(data: Array<T & { id: string | number }>): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiGetRaw: vi.fn(),
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  optionalJwt: async (_c: Context, next: Next) => {
    await next();
  },
}));

vi.mock('../middleware/cache.js', () => ({
  withPublicCache: () => async (_c: Context, next: Next) => {
    await next();
  },
}));

describe('Catálogo público contracts', () => {
  const app = new Hono().route('/catalogo', catalogoRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('honra pageSize documentado nos catálogos públicos', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([]));

    const res = await app.request('/catalogo/cursos?page=2&pageSize=7');

    expect(res.status).toBe(200);
    expect(strapiGet).toHaveBeenCalledWith('/cursos', expect.objectContaining({
      'pagination[page]': '2',
      'pagination[pageSize]': '7',
    }));
  });

  it('lista conteúdos approved e published, alinhado ao pipeline canónico de moderação', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([
      {
        id: 'curso-approved',
        slug: 'curso-approved',
        titulo: 'Curso aprovado',
        descricao: 'Disponível após aprovação',
        estado: 'approved',
      },
    ]));

    const res = await app.request('/catalogo/cursos?page=1&pageSize=12');

    expect(res.status).toBe(200);
    expect(strapiGet).toHaveBeenCalledWith('/cursos', expect.objectContaining({
      'filters[estado][$in]': ['approved', 'published'],
    }));
    await expect(res.json()).resolves.toMatchObject({
      data: [{ id: 'curso-approved', titulo: 'Curso aprovado' }],
    });
  });

  it('devolve 502 sem mascarar falha de persistência do catálogo', async () => {
    vi.mocked(strapiGet).mockRejectedValue(new Error('Strapi indisponível'));

    const res = await app.request('/catalogo/simulacoes?page=1&pageSize=12');

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ error: 'Falha ao carregar catálogo de simulações' });
  });

  it('resolve perfil público por perfil.id numérico gerado pelo próprio catálogo', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([{
      id: '12',
      userId: 'user-1',
      nome: 'Ana PDC',
      tipo: 'estudante',
      reputacaoTier: 'BRONZE',
    }]));

    const res = await app.request('/catalogo/perfil/12');

    expect(res.status).toBe(200);
    expect(strapiGet).toHaveBeenCalledWith('/perfis', expect.objectContaining({
      'filters[$or][0][id][$eq]': '12',
      'filters[$or][1][userId][$eq]': '12',
    }));
    await expect(res.json()).resolves.toMatchObject({
      data: { id: '12', nome: 'Ana PDC', role: 'estudante' },
    });
    expect(strapiGetRaw).not.toHaveBeenCalled();
  });

  it('não consulta perfil.id com texto para evitar 500 do Strapi', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([]));

    const res = await app.request('/catalogo/perfil/perfil-1');

    expect(res.status).toBe(404);
    expect(strapiGet).toHaveBeenCalledWith('/perfis', expect.objectContaining({
      'filters[userId][$eq]': 'perfil-1',
    }));
    expect(strapiGet).not.toHaveBeenCalledWith('/perfis', expect.objectContaining({
      'filters[$or][0][id][$eq]': 'perfil-1',
    }));
  });
});
