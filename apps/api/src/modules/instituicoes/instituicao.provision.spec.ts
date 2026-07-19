import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StrapiListResponse, StrapiSingleResponse } from '@pdc/shared';
import { provisionInstituicaoForUser } from './instituicao.provision.js';
import { strapiDelete, strapiGet, strapiPost, strapiPut } from '../strapi/strapi.client.js';
import type { StrapiInstituicao, StrapiPerfilGestor } from './instituicao.types.js';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
  strapiDelete: vi.fn(),
}));

function listResponse<T>(data: Array<T & { id: string | number }>): StrapiListResponse<T> {
  return { data, meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } } };
}

function singleResponse<T>(data: T & { id: string | number }): StrapiSingleResponse<T> {
  return { data, meta: {} };
}

const instituicao: StrapiInstituicao = {
  id: 'inst-1',
  documentId: 'doc-inst-1',
  nome: 'Instituto PDC',
};

const perfil: StrapiPerfilGestor = {
  id: 'perfil-1',
  documentId: 'perfil-doc-1',
  userId: 'user-1',
};

describe('provisionInstituicaoForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(strapiPut).mockResolvedValue(singleResponse({ id: 'perfil-1' }));
    vi.mocked(strapiDelete).mockResolvedValue(undefined);
  });

  it('retorna instituição existente sem sobrescrever dados', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([{ ...perfil, instituicaoGerida: instituicao }]));

    const result = await provisionInstituicaoForUser('user-1', { nome: 'Novo Nome' });

    expect(result).toEqual({ instituicao: { id: 'inst-1', documentId: 'doc-inst-1', nome: 'Instituto PDC' }, created: false });
    expect(strapiPost).not.toHaveBeenCalled();
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('cria instituição canónica e liga ao perfil gestor', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([perfil]));
    vi.mocked(strapiPost).mockResolvedValue(singleResponse(instituicao));

    const result = await provisionInstituicaoForUser('user-1', {
      nome: 'Instituto PDC',
      nomeLegal: 'Instituto PDC, Lda.',
      tipo: 'instituto',
      natureza: 'privada',
      regiao: 'Luanda',
      nif: '5001234567',
    });

    expect(strapiPost).toHaveBeenCalledWith('/instituicoes', expect.objectContaining({
      nome: 'Instituto PDC',
      nomeLegal: 'Instituto PDC, Lda.',
      tipo: 'instituto',
      natureza: 'privada',
      regiao: 'Luanda',
      nif: '5001234567',
      estado: 'draft',
      aprovada: false,
    }));
    expect(strapiPut).toHaveBeenCalledWith('/perfis/perfil-doc-1', { instituicaoGerida: 'inst-1' });
    expect(result.created).toBe(true);
  });

  it('faz rollback da instituição quando a ligação ao perfil falha', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([perfil]));
    vi.mocked(strapiPost).mockResolvedValue(singleResponse(instituicao));
    vi.mocked(strapiPut).mockRejectedValue(new Error('Strapi relation failed'));

    await expect(provisionInstituicaoForUser('user-1', { nome: 'Instituto PDC' })).rejects.toMatchObject({
      status: 503,
      retryable: true,
      instituicaoId: 'inst-1',
    });
    expect(strapiDelete).toHaveBeenCalledWith('/instituicoes/doc-inst-1');
  });
});
