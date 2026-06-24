import { beforeEach, describe, expect, it, vi } from 'vitest';
import { legalService } from './legal.service.js';
import { strapiGet } from '../strapi/strapi.client.js';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
}));

function listResponse<T extends { id: string | number }>(data: T[]) {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: data.length } },
  };
}

describe('legalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devolve documento legal publicado por slug', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
      id: 1,
      slug: 'termos',
      tipo: 'termos_uso',
      titulo: 'Termos',
      versao: 'termos@2026-06-22',
      conteudo: 'Conteúdo legal',
      effectiveAt: '2026-06-22T00:00:00.000Z',
    }]));

    const result = await legalService.findPublishedBySlug('termos');

    expect(result?.id).toBe('1');
    expect(result?.tipo).toBe('termos_uso');
    expect(strapiGet).toHaveBeenCalledWith('/documentos-legais', {
      'filters[slug][$eq]': 'termos',
      'filters[estado][$eq]': 'published',
      'pagination[pageSize]': '1',
      sort: 'effectiveAt:desc',
    });
  });

  it('devolve null quando documento não existe', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([]));

    await expect(legalService.findPublishedBySlug('inexistente')).resolves.toBeNull();
  });
});
