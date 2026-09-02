import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminApi } from './admin';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('adminApi.repararInstituicao', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('aceita uma resposta de reparação válida', async () => {
    const response = {
      data: {
        id: 42,
        documentId: 'institution-42',
        nome: 'Instituição de QA',
      },
      created: true,
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(response));
    vi.stubGlobal('fetch', fetchMock);

    await expect(adminApi.repararInstituicao('23')).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/utilizadores/23/reparar-instituicao'),
      expect.objectContaining({
        method: 'POST',
        body: '{}',
        credentials: 'include',
      }),
    );
  });

  it('rejeita uma resposta fora do contrato', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      data: { id: 42, nome: 'Instituição de QA' },
      created: 'yes',
    })));

    await expect(adminApi.repararInstituicao('23')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
    });
  });

  it('preserva o conflito semântico devolvido pela reparação', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      error: 'A reparação institucional só pode ser aplicada a contas de instituição',
      code: 'UTILIZADOR_NAO_INSTITUCIONAL',
    }, 409)));

    await expect(adminApi.repararInstituicao('23')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      body: {
        code: 'UTILIZADOR_NAO_INSTITUCIONAL',
      },
    });
  });

  it('preserva retryable quando a reparação está temporariamente indisponível', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      error: 'Provisionamento institucional em curso; tenta novamente',
      retryable: true,
    }, 503)));

    await expect(adminApi.repararInstituicao('23')).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      body: {
        retryable: true,
      },
    });
  });
});
