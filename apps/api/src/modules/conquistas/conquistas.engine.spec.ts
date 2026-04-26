import { describe, it, expect, vi, beforeEach } from 'vitest';
import { conquistaEngine } from './conquistas.engine.js';
import { strapiGet, strapiPost } from '../strapi/strapi.client.js';
import { type StrapiListResponse, type StrapiSingleResponse } from '@pdc/shared';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
}));

vi.mock('../feature-flags/feature-flags.service.js', () => ({
  featureFlagService: {
    getEffectiveFlags: vi.fn().mockResolvedValue({ AUTO_ACHIEVEMENTS: true }),
  },
}));

function listResponse<T extends { id: string | number }>(data: T[]): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: data.length } },
  };
}

function postResponse<T extends { id: string | number }>(data: T): StrapiSingleResponse<T> {
  return { data, meta: {} };
}

describe('ConquistaEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve desbloquear a primeira simulação', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([])); // Conquistas já existentes
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{ id: '1', status: 'concluida' }])); // Tentativas
    vi.mocked(strapiPost).mockResolvedValueOnce(postResponse({ id: 'new-1', slug: 'primeira-simulacao' }));

    const unlocked = await conquistaEngine.verificarConquistas('user-1', 'tentativa.concluida');
    expect(unlocked).toHaveLength(1);
    expect(unlocked[0]?.slug).toBe('primeira-simulacao');
  });
});
