import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { experienciasApi } from '@/lib/api/experiencias';
import { InstituicaoDashboard } from './InstituicaoDashboard';

vi.mock('@/lib/api/experiencias', () => ({
  experienciasApi: {
    getStats: vi.fn(),
  },
}));

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    user: { nome: 'Instituição de QA' },
  }),
}));

describe('COR-0003 institution dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderDashboard() {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <InstituicaoDashboard />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('mostra erro explícito quando as métricas não podem ser carregadas', async () => {
    vi.mocked(experienciasApi.getStats).mockRejectedValueOnce(new Error('dependência indisponível'));

    renderDashboard();

    expect(await screen.findByText('Não foi possível carregar as métricas')).toBeTruthy();
    expect(screen.queryByText('Métricas de Impacto')).toBeNull();
    expect(screen.queryByText('Sem dados suficientes')).toBeNull();
  });
});
