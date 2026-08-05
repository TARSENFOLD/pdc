import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StrapiListResponse } from '@pdc/shared';

import { strapiGet } from '../strapi/strapi.client.js';
import {
  findSimulacao,
  type StrapiSimulacaoAccessRecord,
} from './simulacao-access.repository.js';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
}));

describe('simulation access repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valida o registo autoritativo antes de o devolver à decisão de acesso', async () => {
    const response: StrapiListResponse<StrapiSimulacaoAccessRecord> = {
      data: [{
        id: 1,
        documentId: 'sim-1',
        titulo: 'Simulação publicada',
        autorId: 'author-1',
        estado: 'approved',
        tipo: 2,
        area: 'TECNOLOGIA',
      }],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
    };
    vi.mocked(strapiGet).mockResolvedValue(response);

    await expect(findSimulacao('sim-1', 'published')).resolves.toEqual({
      id: 1,
      documentId: 'sim-1',
      titulo: 'Simulação publicada',
      autorId: 'author-1',
      estado: 'approved',
      tipo: 2,
      area: 'TECNOLOGIA',
    });
    expect(strapiGet).toHaveBeenCalledWith('/simulacoes', expect.objectContaining({
      'filters[$or][1][documentId][$eq]': 'sim-1',
      status: 'published',
    }));
  });

  it('rejeita estado editorial ou identidade de autoria inválidos', async () => {
    const response: StrapiListResponse<{
      id: number;
      documentId: string;
      titulo: string;
      autorId: string;
      estado: string;
      tipo: number;
      area: string;
    }> = {
      data: [{
        id: 1,
        documentId: 'sim-1',
        titulo: 'Simulação inválida',
        autorId: '',
        estado: 'publicada-por-string',
        tipo: 2,
        area: 'TECNOLOGIA',
      }],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
    };
    vi.mocked(strapiGet).mockResolvedValue(response);

    await expect(findSimulacao('sim-1', 'published')).rejects.toThrow();
  });
});
