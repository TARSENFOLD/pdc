import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vocacionalService } from './vocacional.service.js';
import { strapiGet } from '../strapi/strapi.client.js';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
}));

describe('VocacionalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve gerar recomendações baseadas no padrão', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce({
      data: [{ id: 'curso-1', titulo: 'Curso de Teste' }]
    } as unknown);

    const res = await vocacionalService.gerarRecomendacoes({ id: 'pat-1' } as unknown);
    expect(res).toHaveLength(1);
    expect(res[0]?.titulo).toBe('Curso de Teste');
  });
});
