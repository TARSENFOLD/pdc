import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CertificadosPage } from './CertificadosPage';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlags: vi.fn(),
}));

describe('COR-0003 certificates empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFeatureFlags).mockReturnValue({
      flags: {},
      isEnabled: () => false,
      isLoading: false,
    });
  });

  it('não consulta certificados e apresenta apenas estado neutro', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <CertificadosPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Certificados temporariamente indisponíveis')).toBeTruthy();
    expect(screen.queryByText(/Blockchain de Mérito/i)).toBeNull();
  });

  it('não transforma inscrições concluídas em certificados quando a flag está activa', () => {
    vi.mocked(useFeatureFlags).mockReturnValue({
      flags: { certificates_enabled: true },
      isEnabled: (flag) => flag === 'certificates_enabled',
      isLoading: false,
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <CertificadosPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Ainda não existem certificados disponíveis')).toBeTruthy();
    expect(screen.queryByText(/Verificado/i)).toBeNull();
    expect(screen.queryByText(/PDF/i)).toBeNull();
    expect(screen.queryByText(/Partilhar/i)).toBeNull();
    expect(screen.queryByText(/documentos oficiais/i)).toBeNull();
    expect(screen.queryByText(/Decision Engine/i)).toBeNull();
    expect(screen.queryByText(/Blockchain de Mérito/i)).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
