import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RelatoriosInstituicaoPage } from './RelatoriosInstituicaoPage';
import { experienciasApi } from '@/lib/api/experiencias';

vi.mock('@/lib/api/experiencias', () => ({
  experienciasApi: {
    getStats: vi.fn(),
    getMinhas: vi.fn(),
  },
}));

describe('COR-0003 institution reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(experienciasApi.getStats).mockResolvedValue({
      conteudosTotais: 2,
      inscricoesTotais: 7,
      participacoesTotais: 3,
    });
  });

  function renderPage() {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={client}>
        <RelatoriosInstituicaoPage />
      </QueryClientProvider>,
    );
  }

  it('mostra apenas as três contagens autoritativas', async () => {
    renderPage();
    expect(await screen.findByText('Contagens disponíveis')).toBeTruthy();
    expect(screen.getByText('Conteúdos')).toBeTruthy();
    expect(screen.getByText('Inscrições')).toBeTruthy();
    expect(screen.getByText('Participações')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.queryByText('Exportar Relatório Executivo')).toBeNull();
    expect(screen.queryByText('Redução de Evasão')).toBeNull();
    expect(screen.queryByText('Cluster de Talentos')).toBeNull();
  });

  it('mantém null como ausência de dados e zero como contagem real', async () => {
    vi.mocked(experienciasApi.getStats).mockResolvedValueOnce({
      conteudosTotais: null,
      inscricoesTotais: 0,
      participacoesTotais: null,
    });

    renderPage();

    expect((await screen.findAllByText('Sem dados suficientes'))).toHaveLength(2);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('não transforma falha da API em métricas vazias', async () => {
    vi.mocked(experienciasApi.getStats).mockRejectedValueOnce(new Error('dependência indisponível'));

    renderPage();

    expect(await screen.findByText('Não foi possível carregar os relatórios')).toBeTruthy();
    expect(screen.queryByText('Conteúdos')).toBeNull();
  });
});
