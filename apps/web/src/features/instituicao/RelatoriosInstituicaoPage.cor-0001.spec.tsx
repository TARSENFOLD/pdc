import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RelatoriosInstituicaoPage } from './RelatoriosInstituicaoPage';
import { experienciasApi } from '@/lib/api/experiencias';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

vi.mock('@/lib/api/experiencias', () => ({
  experienciasApi: {
    getStats: vi.fn(),
    getMinhas: vi.fn(),
  },
}));

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlags: vi.fn(),
}));

describe('COR-0001 institution reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFeatureFlags).mockReturnValue({
      flags: {},
      isEnabled: () => false,
      isLoading: false,
    });
    vi.mocked(experienciasApi.getStats).mockResolvedValue({
      experienciasPublicadas: 2,
      programasActivos: 1,
      inscricoesTotais: 7,
    });
    vi.mocked(experienciasApi.getMinhas).mockResolvedValue({
      data: [{
        id: 'exp-1',
        slug: 'experiencia-real',
        titulo: 'Experiência real',
        descricao: 'Experiência institucional com dados persistidos.',
        gratuito: true,
        estado: 'published',
        validadoAcademicamente: true,
        inscricoesCount: 7,
      }],
    });
  });

  it('mostra apenas contagens reais e esconde cartões avançados', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <RelatoriosInstituicaoPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Contagens disponíveis')).toBeTruthy();
    expect(screen.getByText('Experiência real')).toBeTruthy();
    expect(screen.queryByText('Redução de Evasão')).toBeNull();
    expect(screen.queryByText('Cluster de Talentos')).toBeNull();
  });
});
