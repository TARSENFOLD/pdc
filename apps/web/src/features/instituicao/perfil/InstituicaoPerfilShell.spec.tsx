import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/http';
import { instituicoesApi } from '@/lib/api/instituicoes';
import { InstituicaoPerfilShell } from './InstituicaoPerfilShell';

describe('InstituicaoPerfilShell', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('explica como recuperar uma associação institucional ausente', async () => {
    const getMe = vi.spyOn(instituicoesApi, 'getMe')
      .mockRejectedValueOnce(new ApiError(409, 'HTTP 409', {
        error: 'O perfil institucional não está associado a uma instituição',
        code: 'INSTITUICAO_ASSOCIACAO_AUSENTE',
        action: 'CONTACTAR_SUPER_ADMIN',
      }))
      .mockResolvedValueOnce({
        id: 'inst-doc-23',
        slug: 'instituicao-pdc',
        estado: 'draft',
        verificada: false,
        identidade: {
          nome: 'Instituição PDC',
          nomeLegal: 'Instituição PDC',
          tipo: 'outro',
          natureza: 'outra',
        },
        completude: 10,
      });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InstituicaoPerfilShell />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Associação institucional pendente')).toBeDefined();
    expect(screen.getByText(/Contacta um Super Admin/)).toBeDefined();
    expect(screen.getByRole('link', { name: 'Contactar suporte' }).getAttribute('href')).toBe(
      '/app/ajuda',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tentar Novamente' }));

    await waitFor(() => {
      expect(getMe).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('Instituição PDC')).toBeDefined();
    expect(screen.queryByText('Associação institucional pendente')).toBeNull();
  });

  it('limita retries e mantém falhas operacionais no estado genérico', async () => {
    const getMe = vi.spyOn(instituicoesApi, 'getMe').mockRejectedValue(
      new ApiError(503, 'HTTP 503', { error: 'Serviço temporariamente indisponível' }),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retryDelay: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InstituicaoPerfilShell />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Perfil institucional indisponível')).toBeDefined();
    expect(screen.getByText(/Não foi possível carregar o perfil institucional/)).toBeDefined();
    expect(screen.queryByText('Associação institucional pendente')).toBeNull();
    expect(getMe).toHaveBeenCalledTimes(3);
  });
});
