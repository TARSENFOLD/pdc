import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CursoMeu } from '@pdc/shared';
import { MentorCursosPage } from './MentorCursosPage';
import { cursosApi } from '@/lib/api/cursos';

vi.mock('@/lib/api/cursos', () => ({
  cursosApi: {
    getMeus: vi.fn(),
    updateEstado: vi.fn(),
  },
}));

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: { role: 'instituicao' } }),
}));

vi.mock('@/hooks/useToast', () => ({ toast: vi.fn() }));

const draftCourse = {
  id: 'curso-draft',
  slug: 'curso-draft',
  titulo: 'Curso em preparação',
  descricao: 'Conteúdo ainda não publicado.',
  totalHoras: 2,
  estado: 'draft',
  autorId: 'instituicao-1',
} satisfies CursoMeu;

const publishedCourse = {
  ...draftCourse,
  id: 'curso-published',
  slug: 'curso-published',
  titulo: 'Curso publicado',
  estado: 'published',
} satisfies CursoMeu;

describe('MentorCursosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cursosApi.getMeus).mockResolvedValue({
      data: [draftCourse, publishedCourse],
      pagination: { page: 1, pageSize: 25, pageCount: 1, total: 2 },
    });
  });

  it('abre conteúdo não publicado como pré-visualização e conteúdo publicado como público', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <MentorCursosPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByRole('link', { name: /Pré-visualizar/ })).toHaveAttribute(
      'href',
      '/app/cursos/curso-draft?preview=true'
    );
    expect(screen.getByRole('link', { name: /^Ver$/ })).toHaveAttribute(
      'href',
      '/app/cursos/curso-published'
    );
  });

  it('não apresenta uma falha de carregamento como se a lista estivesse vazia', async () => {
    vi.mocked(cursosApi.getMeus).mockRejectedValue(new Error('indisponível'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <MentorCursosPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Não foi possível carregar os cursos.')).toBeVisible();
    expect(screen.queryByText('Ainda não criaste nenhum curso.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await vi.waitFor(() => expect(cursosApi.getMeus).toHaveBeenCalledTimes(2));
  });

  it('mantém cursos em cache visíveis quando a atualização falha', async () => {
    vi.mocked(cursosApi.getMeus).mockRejectedValue(new Error('indisponível'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['cursos', 'meus'], {
      data: [draftCourse],
      pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 },
    });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <MentorCursosPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Curso em preparação')).toBeVisible();
    expect(
      await screen.findByText(
        'Não foi possível atualizar a listagem. Os cursos já carregados continuam disponíveis.'
      )
    ).toBeVisible();
    expect(screen.queryByText('Não foi possível carregar os cursos.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar atualizar novamente' }));
    await vi.waitFor(() => expect(cursosApi.getMeus).toHaveBeenCalledTimes(2));
  });
});
