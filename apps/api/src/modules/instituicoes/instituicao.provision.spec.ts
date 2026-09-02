import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StrapiListResponse, StrapiSingleResponse } from '@pdc/shared';
import { provisionInstituicaoForUser } from './instituicao.provision.js';
import {
  StrapiHttpError,
  strapiGet,
  strapiPost,
  strapiPut,
} from '../strapi/strapi.client.js';
import type { StrapiInstituicao, StrapiPerfilGestor } from './instituicao.types.js';

const lockMocks = vi.hoisted(() => ({
  acquireLock: vi.fn(),
  extend: vi.fn(),
  release: vi.fn(),
}));

vi.mock('../strapi/strapi.client.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../strapi/strapi.client.js')>(),
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
}));

vi.mock('../../lib/distributed-lock.js', () => ({
  acquireLock: lockMocks.acquireLock,
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
    lockMocks.extend.mockResolvedValue(true);
    lockMocks.release.mockResolvedValue(true);
    lockMocks.acquireLock.mockResolvedValue({
      key: 'instituicao:provision:user-1',
      fencingToken: 1,
      extend: lockMocks.extend,
      release: lockMocks.release,
    });
    vi.mocked(strapiPut).mockResolvedValue(singleResponse({ id: 'perfil-1' }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna instituição existente sem sobrescrever dados', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([{ ...perfil, instituicaoGerida: instituicao }]));

    const result = await provisionInstituicaoForUser('user-1', { nome: 'Novo Nome' });

    expect(result).toEqual({ instituicao: { id: 'inst-1', documentId: 'doc-inst-1', nome: 'Instituto PDC' }, created: false });
    expect(lockMocks.acquireLock).toHaveBeenCalledWith('instituicao:provision:user-1', 30_000);
    expect(lockMocks.release).toHaveBeenCalledOnce();
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
      slug: 'instituicao-gestor-user-1',
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

  it('mantém a instituição canónica para retry quando a ligação ao perfil falha', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([perfil]));
    vi.mocked(strapiPost).mockResolvedValue(singleResponse(instituicao));
    vi.mocked(strapiPut).mockRejectedValue(new Error('Strapi relation failed'));

    await expect(provisionInstituicaoForUser('user-1', { nome: 'Instituto PDC' })).rejects.toMatchObject({
      status: 503,
      retryable: true,
      instituicaoId: 'inst-1',
    });
    expect(lockMocks.release).toHaveBeenCalledOnce();
  });

  it('preserva falha permanente ao associar o perfil sem a marcar para retry', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([perfil]));
    vi.mocked(strapiPost).mockResolvedValue(singleResponse(instituicao));
    vi.mocked(strapiPut).mockRejectedValue(new StrapiHttpError(
      'relação inválida',
      400,
      '/perfis/perfil-doc-1',
    ));

    await expect(provisionInstituicaoForUser('user-1', { nome: 'Instituto PDC' })).rejects.toMatchObject({
      status: 400,
      retryable: false,
      instituicaoId: 'inst-1',
    });
  });

  it('não mascara um erro de validação 400 como conflito de unicidade', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([perfil]));
    const validationError = new StrapiHttpError(
      'payload inválido',
      400,
      '/instituicoes',
      { error: { message: 'nome is required' } },
    );
    vi.mocked(strapiPost).mockRejectedValueOnce(validationError);

    await expect(provisionInstituicaoForUser('user-1', { nome: 'Instituto PDC' })).rejects.toBe(
      validationError,
    );
    expect(strapiGet).toHaveBeenCalledOnce();
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('impede duas reparações concorrentes de criarem instituições duplicadas', async () => {
    lockMocks.acquireLock
      .mockResolvedValueOnce({
        key: 'instituicao:provision:user-1',
        fencingToken: 1,
        extend: lockMocks.extend,
        release: lockMocks.release,
      })
      .mockResolvedValueOnce(null);
    vi.mocked(strapiGet).mockResolvedValue(listResponse([perfil]));
    vi.mocked(strapiPost).mockResolvedValue(singleResponse(instituicao));

    const results = await Promise.allSettled([
      provisionInstituicaoForUser('user-1', { nome: 'Instituto PDC' }),
      provisionInstituicaoForUser('user-1', { nome: 'Instituto PDC' }),
    ]);

    expect(results[0]).toMatchObject({
      status: 'fulfilled',
      value: { created: true, instituicao: { id: 'inst-1' } },
    });
    expect(results[1]).toMatchObject({
      status: 'rejected',
      reason: { status: 503, retryable: true },
    });
    expect(strapiPost).toHaveBeenCalledOnce();
    expect(strapiPut).toHaveBeenCalledOnce();
    expect(lockMocks.release).toHaveBeenCalledOnce();
  });

  it('renova o lease durante uma leitura longa e impede uma segunda criação', async () => {
    vi.useFakeTimers();
    let heldUntil = 0;
    let resolvePerfis: ((value: StrapiListResponse<StrapiPerfilGestor>) => void) | undefined;
    const release = vi.fn().mockImplementation(() => {
      heldUntil = 0;
      return Promise.resolve(true);
    });
    const extend = vi.fn().mockImplementation((ttlMs: number) => {
      if (Date.now() >= heldUntil) return Promise.resolve(false);
      heldUntil = Date.now() + ttlMs;
      return Promise.resolve(true);
    });
    lockMocks.acquireLock.mockImplementation((_key: string, ttlMs: number) => {
      if (Date.now() < heldUntil) return Promise.resolve(null);
      heldUntil = Date.now() + ttlMs;
      return Promise.resolve({
        key: 'instituicao:provision:user-1',
        fencingToken: 1,
        extend,
        release,
      });
    });
    vi.mocked(strapiGet).mockImplementationOnce(() => new Promise((resolve) => {
      resolvePerfis = resolve;
    }));
    vi.mocked(strapiPost).mockResolvedValue(singleResponse(instituicao));

    const firstRepair = provisionInstituicaoForUser('user-1', { nome: 'Instituto PDC' });
    await vi.advanceTimersByTimeAsync(0);
    expect(strapiGet).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(30_001);
    const secondRepair = provisionInstituicaoForUser('user-1', { nome: 'Instituto PDC' });
    const resultsPromise = Promise.allSettled([firstRepair, secondRepair]);
    resolvePerfis?.(listResponse([perfil]));
    await vi.advanceTimersByTimeAsync(0);
    const results = await resultsPromise;

    expect(extend).toHaveBeenCalledWith(30_000);
    expect(extend.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(results[0]).toMatchObject({ status: 'fulfilled', value: { created: true } });
    expect(results[1]).toMatchObject({ status: 'rejected', reason: { status: 503 } });
    expect(strapiPost).toHaveBeenCalledOnce();
    expect(strapiPut).toHaveBeenCalledOnce();
  });

  it.each([
    ['perda de ownership', false],
    ['falha Redis', new Error('Redis unavailable')],
  ])('interrompe escritas após %s durante a renovação', async (_scenario, outcome) => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([perfil]));
    if (outcome instanceof Error) {
      lockMocks.extend.mockRejectedValueOnce(outcome);
    } else {
      lockMocks.extend.mockResolvedValueOnce(outcome);
    }

    await expect(provisionInstituicaoForUser('user-1', { nome: 'Instituto PDC' })).rejects.toMatchObject({
      status: 503,
      retryable: true,
    });
    expect(strapiPost).not.toHaveBeenCalled();
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('faz workers com leases diferentes convergirem para a mesma instituição', async () => {
    const firstExtend = vi.fn().mockResolvedValue(true);
    const secondExtend = vi.fn().mockResolvedValue(true);
    const firstRelease = vi.fn().mockResolvedValue(true);
    const secondRelease = vi.fn().mockResolvedValue(true);
    lockMocks.acquireLock
      .mockResolvedValueOnce({
        key: 'instituicao:provision:user-1',
        fencingToken: 1,
        extend: firstExtend,
        release: firstRelease,
      })
      .mockResolvedValueOnce({
        key: 'instituicao:provision:user-1',
        fencingToken: 2,
        extend: secondExtend,
        release: secondRelease,
      });
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([perfil]))
      .mockResolvedValueOnce(listResponse([perfil]))
      .mockResolvedValueOnce(listResponse([instituicao]));
    vi.mocked(strapiPost)
      .mockResolvedValueOnce(singleResponse(instituicao))
      .mockRejectedValueOnce(new StrapiHttpError(
        'slug duplicado',
        400,
        '/instituicoes',
        {
          error: {
            message: 'Validation error',
            details: { errors: [{ path: ['slug'] }] },
          },
        },
      ));
    let resolveStaleAssociation: ((value: StrapiSingleResponse<{ id: string }>) => void) | undefined;
    vi.mocked(strapiPut)
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveStaleAssociation = resolve;
      }))
      .mockResolvedValueOnce(singleResponse({ id: 'perfil-1' }));

    const staleRepair = provisionInstituicaoForUser('user-1', { nome: 'Instituto PDC' });
    await vi.waitFor(() => {
      expect(strapiPut).toHaveBeenCalledOnce();
    });
    const currentResult = await provisionInstituicaoForUser('user-1', { nome: 'Nome concorrente' });
    resolveStaleAssociation?.(singleResponse({ id: 'perfil-1' }));
    const staleResult = await staleRepair;

    expect(currentResult).toMatchObject({ created: false, instituicao: { id: 'inst-1' } });
    expect(staleResult).toMatchObject({ created: true, instituicao: { id: 'inst-1' } });
    expect(strapiPost).toHaveBeenNthCalledWith(
      1,
      '/instituicoes',
      expect.objectContaining({ slug: 'instituicao-gestor-user-1', nome: 'Instituto PDC' }),
    );
    expect(strapiPost).toHaveBeenNthCalledWith(
      2,
      '/instituicoes',
      expect.objectContaining({ slug: 'instituicao-gestor-user-1', nome: 'Nome concorrente' }),
    );
    expect(strapiPut).toHaveBeenCalledTimes(2);
    expect(strapiPut).toHaveBeenNthCalledWith(
      1,
      '/perfis/perfil-doc-1',
      { instituicaoGerida: 'inst-1' },
    );
    expect(strapiPut).toHaveBeenNthCalledWith(
      2,
      '/perfis/perfil-doc-1',
      { instituicaoGerida: 'inst-1' },
    );
  });

  it('preserva o resultado quando o release rejeita após persistir a associação', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([perfil]));
    vi.mocked(strapiPost).mockResolvedValue(singleResponse(instituicao));
    lockMocks.release.mockRejectedValueOnce(new Error('Redis release failed'));

    await expect(provisionInstituicaoForUser('user-1', { nome: 'Instituto PDC' })).resolves.toMatchObject({
      created: true,
      instituicao: { id: 'inst-1' },
    });
    expect(strapiPost).toHaveBeenCalledOnce();
    expect(strapiPut).toHaveBeenCalledWith('/perfis/perfil-doc-1', { instituicaoGerida: 'inst-1' });
  });

  it('preserva o resultado idempotente quando o lease já expirou no release', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([perfil]));
    vi.mocked(strapiPost).mockResolvedValue(singleResponse(instituicao));
    lockMocks.release.mockResolvedValueOnce(false);

    await expect(provisionInstituicaoForUser('user-1', { nome: 'Instituto PDC' })).resolves.toMatchObject({
      created: true,
      instituicao: { id: 'inst-1' },
    });
  });
});
