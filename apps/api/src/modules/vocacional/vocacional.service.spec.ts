import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vocacionalService } from './vocacional.service.js';
import { strapiGet } from '../strapi/strapi.client.js';
import type { PerfilVocacional, StrapiListResponse } from '@pdc/shared';

function listResponse<T>(data: Array<T & { id: string | number }>): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
}));

describe('VocacionalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve gerar recomendações baseadas no padrão', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{ id: 'curso-1', titulo: 'Curso de Teste' }]));

    const perfil: PerfilVocacional = {
      id: 'pat-1',
      perfilId: 'perfil-1',
      scoreGlobal: 80,
      certeza: 'ALTA',
      totalEventos: 60,
      areaMatch: 'TECNOLOGIA',
      aptidao: 0.8,
      dedicacao: 0.7,
      dimensoes: { fluidez: 7, resiliencia: 8, foco: 7 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = await vocacionalService.gerarRecomendacoes(perfil);
    expect(res).toHaveLength(1);
    expect(res[0]?.titulo).toBe('Curso de Teste');
  });

  it('requests only canonical profile fields when calculating a profile', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 'perfil-1', xp: 0, areasInteresse: ['TECNOLOGIA'] }]))
      .mockResolvedValueOnce(listResponse([]));

    for (let index = 0; index < 13; index += 1) {
      vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([]));
    }

    await vocacionalService.calcularPerfil('user-1');

    expect(strapiGet).toHaveBeenNthCalledWith(1, '/perfis', {
      'filters[userId][$eq]': 'user-1',
      'fields[0]': 'id',
      'fields[1]': 'xp',
      'fields[2]': 'areasInteresse',
    });
  });
});
