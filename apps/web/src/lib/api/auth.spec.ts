import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@pdc/shared';
import { authApi } from './auth';

const user: User = {
  id: 'user-1',
  email: 'user@example.com',
  nome: 'Ana',
  role: 'estudante',
  areasInteresse: [],
  conquistas: [],
  xp: 0,
  reputacao: 0,
  reputacaoTier: 'BRONZE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('authApi.restoreSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renova uma sessão persistente quando o access token expirou', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(null))
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(jsonResponse(user));
    vi.stubGlobal('fetch', fetchMock);

    await expect(authApi.restoreSession()).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/auth/refresh'),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('retorna anónimo quando não existe refresh token válido', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(null))
      .mockResolvedValueOnce(jsonResponse({ error: 'Invalid refresh token' }, 401)));

    await expect(authApi.restoreSession()).resolves.toBeNull();
  });

  it('não mascara indisponibilidade do serviço de sessão', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(null))
      .mockResolvedValueOnce(jsonResponse({ error: 'unavailable' }, 503)));

    await expect(authApi.restoreSession()).rejects.toMatchObject({ status: 503 });
  });
});
