import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@pdc/shared';
import { ApiError } from '@/lib/api/http';
import { AdminUtilizadoresPage } from './AdminUtilizadoresPage';

const apiMocks = vi.hoisted(() => ({
  getUtilizadores: vi.fn(),
  repararInstituicao: vi.fn(),
}));
const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/admin', () => ({
  adminApi: {
    getUtilizadores: apiMocks.getUtilizadores,
    updateRole: vi.fn(),
    suspender: vi.fn(),
    reativar: vi.fn(),
    repararInstituicao: apiMocks.repararInstituicao,
  },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

function institution(id: string, instituicaoId: string | null): User {
  return {
    id,
    email: `instituicao-${id}@pdc.ao`,
    nome: `Instituição ${id}`,
    role: 'instituicao',
    perfilId: `perfil-${id}`,
    instituicaoId,
    reputacaoTier: 'BRONZE',
    xp: 0,
    reputacao: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    areasInteresse: [],
    conquistas: [],
  };
}

describe('AdminUtilizadoresPage — reparação institucional', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getUtilizadores.mockResolvedValue({
      data: [institution('23', null), institution('24', 'inst-doc-24')],
      pagination: { total: 2, page: 1, pageSize: 10, pageCount: 1 },
    });
    apiMocks.repararInstituicao.mockResolvedValue({
      data: { id: 'inst-23', documentId: 'inst-doc-23', nome: 'Instituição 23' },
      created: true,
    });
  });

  it('mostra a ação apenas para a instituição sem associação e executa a reparação', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AdminUtilizadoresPage />
      </QueryClientProvider>,
    );

    const repairButtons = await screen.findAllByRole('button', { name: 'Reparar instituição' });
    expect(repairButtons).toHaveLength(1);
    const repairButton = repairButtons[0];
    if (!repairButton) throw new Error('Botão de reparação não encontrado');
    fireEvent.click(repairButton);

    await waitFor(() => {
      expect(apiMocks.repararInstituicao).toHaveBeenCalledWith('23');
    });
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Instituição associada',
    }));
  });

  it('mostra o erro devolvido pela API quando a reparação falha', async () => {
    apiMocks.repararInstituicao.mockRejectedValueOnce(new ApiError(503, 'HTTP 503', {
      error: 'Instituição criada, mas ligação ao gestor pendente de retry',
      retryable: true,
    }));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AdminUtilizadoresPage />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Reparar instituição' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({
        title: 'Não foi possível reparar a instituição',
        description: 'Instituição criada, mas ligação ao gestor pendente de retry',
        variant: 'error',
      });
    });
  });
});
