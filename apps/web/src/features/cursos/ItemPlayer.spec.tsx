import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Curso } from '@pdc/shared';
import FocusHeader from '@/components/layout/FocusHeader';
import FocusModeProvider from '@/components/layout/FocusModeProvider';
import { cursosApi } from '@/lib/api/cursos';
import { ApiError } from '@/lib/api/http';
import { ItemPlayer } from './ItemPlayer';

vi.mock('@/lib/api/cursos', () => ({
  cursosApi: {
    getById: vi.fn(),
    getProgresso: vi.fn(),
    updateProgresso: vi.fn(),
  },
}));

const curso: Curso = {
  id: 'curso-1',
  slug: 'curso-teste',
  titulo: 'Curso de teste',
  descricao: 'Descrição completa do curso de teste.',
  autorId: 'mentor-1',
  totalHoras: 1,
  estado: 'approved',
  rating: 0,
  inscritosCount: 0,
  modulos: [
    {
      id: 'modulo-1',
      titulo: 'Introdução',
      ordem: 1,
      itens: [
        {
          id: 'item-1',
          titulo: 'Aula de recuperação',
          tipo: 'texto',
          conteudo: 'Conteúdo disponível depois da recuperação do progresso.',
          ordem: 1,
        },
      ],
    },
  ],
  createdAt: '2026-09-07T12:00:00.000Z',
  updatedAt: '2026-09-07T12:00:00.000Z',
};

function renderPlayer(): ReturnType<typeof render> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/app/cursos/curso-1/itens/item-1']}>
        <FocusModeProvider>
          <FocusHeader />
          <Routes>
            <Route path="/app/cursos/:cursoId/itens/:itemId" element={<ItemPlayer />} />
          </Routes>
        </FocusModeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ItemPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cursosApi.getById).mockResolvedValue(curso);
  });

  it('recupera de uma falha transitória ao recarregar o progresso', async () => {
    vi.mocked(cursosApi.getProgresso)
      .mockRejectedValueOnce(new ApiError(503, 'Indisponível'))
      .mockResolvedValueOnce([]);

    renderPlayer();

    expect(
      await screen.findByText('Não foi possível carregar o progresso. Tenta novamente.')
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(
      await screen.findByText('Conteúdo disponível depois da recuperação do progresso.')
    ).toBeVisible();
  });

  it('não apresenta a aula antes de confirmar a inscrição e o progresso', async () => {
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

    renderPlayer();

    await act(async () => {
      resolveCourse?.(curso);
      await Promise.resolve();
    });

    expect(
      screen.queryByText('Conteúdo disponível depois da recuperação do progresso.')
    ).not.toBeInTheDocument();

    resolveProgress?.([]);

    expect(
      await screen.findByText('Conteúdo disponível depois da recuperação do progresso.')
    ).toBeVisible();
  });

  it('não revela a aula quando o estudante não está inscrito', async () => {
    vi.mocked(cursosApi.getProgresso).mockRejectedValueOnce(new ApiError(403, 'Sem inscrição'));

    renderPlayer();

    expect(await screen.findByText('Inscreve-te no curso para aceder ao player.')).toBeVisible();
    expect(
      screen.queryByText('Conteúdo disponível depois da recuperação do progresso.')
    ).not.toBeInTheDocument();
  });
});
