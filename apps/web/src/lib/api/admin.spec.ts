import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminApi } from './admin';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
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
});
