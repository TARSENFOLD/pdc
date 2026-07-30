import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CertificadosPage } from './CertificadosPage';
import { cursosApi } from '@/lib/api/cursos';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

vi.mock('@/lib/api/cursos', () => ({
  cursosApi: {
    getCertificados: vi.fn(),
  },
}));

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlags: vi.fn(),
}));

describe('COR-0001 certificates empty state', () => {
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
    expect(cursosApi.getCertificados).not.toHaveBeenCalled();
  });
});
