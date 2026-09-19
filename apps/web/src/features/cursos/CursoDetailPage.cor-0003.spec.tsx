import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Curso } from '@pdc/shared';
import { CursoDetailPage } from './CursoDetailPage';
import { cursosApi } from '@/lib/api/cursos';
import { ratingsApi } from '@/lib/api/interactions';
import { ApiError } from '@/lib/api/http';

const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/cursos', () => ({
  cursosApi: {
    getById: vi.fn(),
    getPreviewById: vi.fn(),
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

vi.mock('@/hooks/useToast', () => ({ toast: toastMock }));

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

describe('CursoDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cursosApi.getById).mockResolvedValue(curso);
    vi.mocked(cursosApi.getPreviewById).mockResolvedValue({ ...curso, estado: 'review' });
    vi.mocked(cursosApi.getProgresso).mockResolvedValue([]);
    vi.mocked(ratingsApi.getStats).mockResolvedValue({ media: 0, total: 0, userRating: null });
  });

  it('abre a versão não publicada em modo de pré-visualização sem pedir inscrição', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/app/cursos/curso-1?preview=true']}>
          <Routes>
            <Route path="/app/cursos/:id" element={<CursoDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Pré-visualização do criador.')).toBeInTheDocument();
    expect(cursosApi.getPreviewById).toHaveBeenCalledWith('curso-1');
    expect(cursosApi.getById).not.toHaveBeenCalled();
    expect(cursosApi.getProgresso).not.toHaveBeenCalled();
    expect(ratingsApi.getStats).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Iniciar Percurso Soberano' })).toBeNull();
  });

  it('mostra o erro da pré-visualização sem iniciar pedidos de consumo', async () => {
    vi.mocked(cursosApi.getPreviewById).mockRejectedValueOnce(
      new ApiError(404, 'Curso não encontrado')
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/app/cursos/curso-1?preview=true']}>
          <Routes>
            <Route path="/app/cursos/:id" element={<CursoDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Erro ao carregar o curso')).toBeInTheDocument();
    expect(cursosApi.getProgresso).not.toHaveBeenCalled();
    expect(ratingsApi.getStats).not.toHaveBeenCalled();
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
      </QueryClientProvider>
    );

    expect(await screen.findByText('Curso de Teste')).toBeTruthy();
    expect(screen.queryByText('Aptidão Validada')).toBeNull();
    expect(screen.queryByText('Certificado Digital')).toBeNull();
    expect(screen.queryByText('Certificado disponível após conclusão')).toBeNull();
    expect(screen.queryByText('Certificado emitido')).toBeNull();
  });

  it('reconcilia uma inscrição já existente sem mostrar um erro genérico', async () => {
    vi.mocked(cursosApi.getProgresso).mockRejectedValueOnce(
      new ApiError(404, 'Inscrição não encontrada')
    );
    vi.mocked(cursosApi.inscrever).mockRejectedValueOnce(
      new ApiError(409, 'Inscrição já existente')
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/app/cursos/curso-1']}>
          <Routes>
            <Route path="/app/cursos/:id" element={<CursoDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar Percurso Soberano' }));

    await waitFor(() => {
      expect(cursosApi.inscrever).toHaveBeenCalledWith('curso-1');
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['cursos', 'curso-1', 'progresso'],
    });
    expect(toastMock).not.toHaveBeenCalled();
  });
});
