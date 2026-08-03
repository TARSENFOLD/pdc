import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  strapiGet: vi.fn(),
  isEnabled: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: mocks.strapiGet,
}));
vi.mock('../modules/feature-flags/feature-flags.service.js', () => ({
  featureFlagService: {
    isEnabled: mocks.isEnabled,
  },
}));
vi.mock('pino', () => ({
  default: vi.fn(() => ({ error: mocks.error })),
}));

import { seoRoutes } from './seo.js';

function mockSitemapContent(): void {
  mocks.strapiGet.mockImplementation((path: string) => {
    if (path === '/cursos') {
      return { data: [{ id: 1, slug: 'curso-publico' }] };
    }
    if (path === '/simulacoes') {
      return { data: [{ id: 2, slug: 'simulacao-publica' }] };
    }
    return {
      data: [
        { id: 3, slug: 'experiencia-institucional', tipoExperiencia: 'institucional' },
        { id: 4, slug: 'experiencia-vwx', tipoExperiencia: 'vwx' },
        { id: 5, slug: 'experiencia-legada' },
      ],
    };
  });
}

describe('GET /sitemap.xml — contenção VWX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSitemapContent();
    mocks.isEnabled.mockResolvedValue(true);
  });

  it('remove VWX e mantém Institucional e legado quando o flag está desligado', async () => {
    mocks.isEnabled.mockResolvedValue(false);

    const res = await seoRoutes.request('/sitemap.xml');
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(xml).toContain('/experiencias/experiencia-institucional');
    expect(xml).toContain('/experiencias/experiencia-legada');
    expect(xml).not.toContain('/experiencias/experiencia-vwx');
    expect(mocks.isEnabled).toHaveBeenCalledWith('vwx_catalog_enabled');
  });

  it('permite VWX quando o flag está ligado', async () => {
    const res = await seoRoutes.request('/sitemap.xml');
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(xml).toContain('/experiencias/experiencia-vwx');
  });

  it('falha fechado para VWX quando o registry está indisponível', async () => {
    mocks.isEnabled.mockRejectedValue(new Error('Registry indisponível'));

    const res = await seoRoutes.request('/sitemap.xml');
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(xml).toContain('/experiencias/experiencia-institucional');
    expect(xml).toContain('/experiencias/experiencia-legada');
    expect(xml).not.toContain('/experiencias/experiencia-vwx');
  });
});
