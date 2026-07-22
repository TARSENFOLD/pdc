import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BootstrapResponse } from '@pdc/shared';
import { ApiError, http } from '@/lib/api/http';
import { fetchBootstrap } from './bootstrap-client';

const unknownBootstrap: BootstrapResponse = {
  session: { status: 'unknown', isAuthenticated: false, user: null },
  capabilities: { features: {}, roles: [] },
  security: {},
  ux: { theme: 'claro' },
};

const anonymousBootstrap: BootstrapResponse = {
  ...unknownBootstrap,
  session: { status: 'anonymous', isAuthenticated: false, user: null },
};

const authenticatedBootstrap: BootstrapResponse = {
  ...unknownBootstrap,
  session: {
    status: 'authenticated',
    isAuthenticated: true,
    user: { id: 'user-1', email: 'user@pdc.test', role: 'estudante' },
  },
};

describe('fetchBootstrap', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('bloqueia /app com erro recuperável quando a sessão não pode ser verificada', async () => {
    window.history.replaceState({}, '', '/app');
    vi.spyOn(http, 'getParsed').mockResolvedValue(unknownBootstrap);
    const refresh = vi.spyOn(http, 'post');

    await expect(fetchBootstrap()).rejects.toMatchObject({ status: 503 });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('mantém a página de login disponível quando a sessão está desconhecida', async () => {
    window.history.replaceState({}, '', '/login');
    vi.spyOn(http, 'getParsed').mockResolvedValue(unknownBootstrap);
    const refresh = vi.spyOn(http, 'post');

    await expect(fetchBootstrap()).resolves.toEqual(unknownBootstrap);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('propaga falha da segunda leitura após um refresh bem-sucedido', async () => {
    window.history.replaceState({}, '', '/app');
    vi.spyOn(http, 'getParsed')
      .mockResolvedValueOnce(anonymousBootstrap)
      .mockRejectedValueOnce(new Error('bootstrap unavailable'));
    vi.spyOn(http, 'post').mockResolvedValue({ success: true });

    await expect(fetchBootstrap()).rejects.toThrow('bootstrap unavailable');
  });

  it('devolve a sessão autenticada após um refresh bem-sucedido', async () => {
    vi.spyOn(http, 'getParsed')
      .mockResolvedValueOnce(anonymousBootstrap)
      .mockResolvedValueOnce(authenticatedBootstrap);
    vi.spyOn(http, 'post').mockResolvedValue({ success: true });

    await expect(fetchBootstrap()).resolves.toEqual(authenticatedBootstrap);
  });

  it('bloqueia /app quando a segunda leitura continua com sessão desconhecida', async () => {
    window.history.replaceState({}, '', '/app');
    vi.spyOn(http, 'getParsed')
      .mockResolvedValueOnce(anonymousBootstrap)
      .mockResolvedValueOnce(unknownBootstrap);
    vi.spyOn(http, 'post').mockResolvedValue({ success: true });

    await expect(fetchBootstrap()).rejects.toMatchObject({ status: 503 });
  });

  it('mantém sessão anónima apenas quando o refresh é explicitamente inválido', async () => {
    vi.spyOn(http, 'getParsed').mockResolvedValue(anonymousBootstrap);
    vi.spyOn(http, 'post').mockRejectedValue(new ApiError(401, 'Invalid refresh token'));

    await expect(fetchBootstrap()).resolves.toEqual(anonymousBootstrap);
  });

  it('propaga indisponibilidade operacional do refresh para retry', async () => {
    vi.spyOn(http, 'getParsed').mockResolvedValue(anonymousBootstrap);
    vi.spyOn(http, 'post').mockRejectedValue(new ApiError(503, 'Session unavailable'));

    await expect(fetchBootstrap()).rejects.toMatchObject({ status: 503 });
  });
});
