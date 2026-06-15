import { beforeEach, describe, expect, it, vi } from 'vitest';
import { strapiGet } from '../strapi/strapi.client.js';
import { tinaContextService } from './tina-context.service.js';
import type { StrapiListResponse } from '@pdc/shared';

const buildContextoMock = vi.hoisted(() => vi.fn());

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
}));

vi.mock('../ai/ai.service.js', () => ({
  aiService: {
    buildContexto: buildContextoMock,
  },
}));

describe('tinaContextService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(strapiGet).mockResolvedValue({
      data: [{
        id: 1,
        nome: 'Instituição PDC',
        headline: 'Orientação em Angola',
        instituicao: { nome: 'Universidade Agostinho Neto' },
      }],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
    } as StrapiListResponse<{
      id: number;
      nome: string;
      headline: string;
      instituicao: { nome: string };
    }>);
  });

  it('não calcula perfil vocacional para instituições', async () => {
    const context = await tinaContextService.build('user-1', 'instituicao');

    expect(context).toContain('Papel atual: Instituição');
    expect(context).toContain('Instituição PDC');
    expect(context).toContain('Universidade Agostinho Neto');
    expect(buildContextoMock).not.toHaveBeenCalled();
  });

  it('identifica contexto não autenticado sem consultar dependências', async () => {
    expect(await tinaContextService.build(null, 'estudante')).toBe('Utilizador não autenticado.');
    expect(await tinaContextService.build('user-1', undefined)).toBe('Utilizador não autenticado.');
    expect(strapiGet).not.toHaveBeenCalled();
  });

  it('mantém o chat utilizável quando o contexto vocacional falha', async () => {
    buildContextoMock.mockRejectedValue(new Error('Strapi indisponível'));

    const context = await tinaContextService.build('user-1', 'estudante');

    expect(context).toContain('Papel atual: Estudante');
    expect(context).toContain('Ainda não há contexto vocacional disponível');
  });

  it('inclui contexto vocacional disponível para estudantes', async () => {
    buildContextoMock.mockResolvedValue('Interesses: Matemática e Ciências.');
    const context = await tinaContextService.build('user-1', 'estudante');
    expect(context).toContain('Papel atual: Estudante');
    expect(context).toContain('Interesses: Matemática e Ciências.');
    expect(buildContextoMock).toHaveBeenCalledWith('user-1');
  });
});
