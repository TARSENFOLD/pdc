import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Curso } from '@pdc/shared';
import FocusHeader from '@/components/layout/FocusHeader';
import FocusModeProvider from '@/components/layout/FocusModeProvider';
import { cursosApi } from '@/lib/api/cursos';
import { CourseWelcomePage } from './CourseWelcomePage';
import { ApiError } from '@/lib/api/http';

vi.mock('@/lib/api/cursos', () => ({
  cursosApi: {
    getById: vi.fn(),
    getProgresso: vi.fn(),
  },
}));

const curso: Curso = {
  id: 'curso-1',
  slug: 'fundamentos-de-cloud',
  titulo: 'Fundamentos de Cloud',
  descricao: 'Aprende os conceitos essenciais para construir soluções seguras na cloud.',
  area: 'TECNOLOGIA',
  nivel: 'basico',
  gratuito: true,
  capaUrl: 'https://cdn.example.com/cloud.jpg',
  autorId: 'mentor-1',
  totalHoras: 4,
  estado: 'approved',
  rating: 0,
  inscritosCount: 2,
  modulos: [
    {
      id: 'modulo-1',
      titulo: 'Introdução',
      ordem: 0,
      itens: [
        {
          id: 'item-1',
          titulo: 'Bem-vindo',
          tipo: 'texto',
          conteudo: 'Abertura do curso',
          ordem: 0,
        },
      ],
    },
  ],
  createdAt: '2026-09-03T00:00:00.000Z',
  updatedAt: '2026-09-03T00:00:00.000Z',
};

function renderPage(): ReturnType<typeof render> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/app/cursos/curso-1/interior']}>
        <FocusModeProvider>
          <FocusHeader />
          <Routes>
            <Route path="/app/cursos/:cursoId/interior" element={<CourseWelcomePage />} />
            <Route path="/app/cursos/:cursoId/itens/:itemId" element={<p>Conteúdo aberto</p>} />
          </Routes>
        </FocusModeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CourseWelcomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cursosApi.getById).mockResolvedValue(curso);
    vi.mocked(cursosApi.getProgresso).mockResolvedValue([]);
  });

  it('apresenta uma entrada visual antes do primeiro conteúdo', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Fundamentos de Cloud' })).toBeVisible();
    expect(
      screen.getByText('Aprende os conceitos essenciais para construir soluções seguras na cloud.')
    ).toBeVisible();
    expect(screen.getByText('1 módulo')).toBeVisible();
    expect(screen.getByText('1 aula')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    expect(await screen.findByText('Conteúdo aberto')).toBeVisible();
  });

  it('espera pelo progresso antes de escolher a aula de continuação', async () => {
    let resolveCourse: ((value: Curso) => void) | undefined;
    let resolveProgress: ((value: []) => void) | undefined;
    vi.mocked(cursosApi.getById).mockReturnValueOnce(
      new Promise<Curso>((resolve) => {
        resolveCourse = resolve;
      })
    );
    vi.mocked(cursosApi.getProgresso).mockReturnValueOnce(
      new Promise<[]>((resolve) => {
        resolveProgress = resolve;
      })
    );

    renderPage();

    await act(async () => {
      resolveCourse?.(curso);
      await Promise.resolve();
    });

    expect(screen.queryByRole('heading', { name: 'Fundamentos de Cloud' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Começar' })).not.toBeInTheDocument();

    resolveProgress?.([]);

    expect(await screen.findByRole('button', { name: 'Começar' })).toBeVisible();
  });

  it('permite ocultar e restaurar o currículo no desktop', async () => {
    renderPage();

    const hideButton = await screen.findByRole('button', { name: 'Ocultar currículo' });
    fireEvent.click(hideButton);

    const showButton = screen.getByRole('button', { name: 'Mostrar currículo' });
    expect(showButton).toBeVisible();
    fireEvent.click(showButton);
    expect(screen.getByRole('button', { name: 'Ocultar currículo' })).toBeVisible();
  });

  it('pede inscrição quando o progresso não está disponível', async () => {
    vi.mocked(cursosApi.getProgresso).mockRejectedValueOnce(new ApiError(403, 'Sem inscrição'));

    renderPage();

    expect(await screen.findByText('Inscreve-te no curso para aceder ao conteúdo.')).toBeVisible();
  });

  it('apresenta uma falha recuperável quando o serviço de progresso está indisponível', async () => {
    vi.mocked(cursosApi.getProgresso).mockRejectedValueOnce(new ApiError(503, 'Indisponível'));

    renderPage();

    expect(
      await screen.findByText('Não foi possível carregar o progresso. Tenta novamente.')
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByRole('button', { name: 'Começar' })).toBeVisible();
    expect(
      screen.queryByText('Não foi possível carregar o progresso. Tenta novamente.')
    ).not.toBeInTheDocument();
  });

  it('permite repetir o carregamento do curso depois de uma falha transitória', async () => {
    vi.mocked(cursosApi.getById)
      .mockRejectedValueOnce(new ApiError(503, 'Indisponível'))
      .mockResolvedValueOnce(curso);

    renderPage();

    expect(
      await screen.findByText('Não foi possível carregar o curso. Tenta novamente.')
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByRole('heading', { name: 'Fundamentos de Cloud' })).toBeVisible();
  });
});
