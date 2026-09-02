import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Curso } from '@pdc/shared';
import { CursoDetailPage } from './CursoDetailPage';
import { cursosApi } from '@/lib/api/cursos';
import { ratingsApi } from '@/lib/api/interactions';

vi.mock('@/lib/api/cursos', () => ({
  cursosApi: {
    getById: vi.fn(),
    getProgresso: vi.fn(),
    inscrever: vi.fn(),
  },
}));

vi.mock('@/lib/api/interactions', () => ({
  ratingsApi: { getStats: vi.fn() },
}));

vi.mock('@/hooks/useTelemetry', () => ({
  useTelemetry: () => ({ track: vi.fn() }),
}));

const curso: Curso = {
  id: 'curso-1',
  slug: 'curso-de-teste',
  titulo: 'Curso de Teste',
  descricao: 'Conteúdo de teste para validar a ausência de alegações de certificado.',
  area: 'TECNOLOGIA',
  nivel: 'basico',
  gratuito: true,
  capaUrl: undefined,
  autorId: 'mentor-1',
  totalHoras: 3,
  estado: 'approved',
  rating: 0,
  inscritosCount: 0,
  createdAt: '2026-08-06T00:00:00.000Z',
  updatedAt: '2026-08-06T00:00:00.000Z',
};

describe('COR-0003 course certificate claims', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cursosApi.getById).mockResolvedValue(curso);
    vi.mocked(cursosApi.getProgresso).mockResolvedValue([]);
    vi.mocked(ratingsApi.getStats).mockResolvedValue({ media: 0, total: 0, userRating: null });
  });

  it('não anuncia aptidão ou certificado sem contrato autoritativo', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/app/cursos/curso-1']}>
          <Routes>
            <Route path="/app/cursos/:id" element={<CursoDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Curso de Teste')).toBeTruthy();
    expect(screen.queryByText('Aptidão Validada')).toBeNull();
    expect(screen.queryByText('Certificado Digital')).toBeNull();
    expect(screen.queryByText('Certificado disponível após conclusão')).toBeNull();
    expect(screen.queryByText('Certificado emitido')).toBeNull();
  });
});
