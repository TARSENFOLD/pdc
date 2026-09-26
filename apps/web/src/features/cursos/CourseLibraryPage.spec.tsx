import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CursoSchema, type Role } from '@pdc/shared';
import { cursosApi } from '@/lib/api/cursos';
import { CourseLibraryPage } from './CourseLibraryPage';

const auth = vi.hoisted(() => ({ role: 'instituicao' as Role }));
vi.mock('@/lib/auth/auth-context', () => ({ useAuth: () => ({ user: { role: auth.role } }) }));
vi.mock('@/lib/api/cursos', () => ({ cursosApi: {
  getMeus: vi.fn(), getMinhasInscricoes: vi.fn(), updateEstado: vi.fn(),
} }));

function renderLibrary(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '*', element: <CourseLibraryPage /> }], {
    initialEntries: [path],
  });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return { router, client };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.role = 'instituicao';
  vi.mocked(cursosApi.getMeus).mockResolvedValue({
    data: [{ id: 'draft-1', slug: 'rascunho', titulo: 'Curso que criei', descricao: 'Rascunho privado.', estado: 'draft', autorId: 'me', totalHoras: 1 }],
    pagination: { page: 1, pageSize: 25, total: 1, pageCount: 1 },
  });
  vi.mocked(cursosApi.getMinhasInscricoes).mockResolvedValue({ data: [{
    id: 'enrollment-1', cursoId: 'learning-1', dataInscricao: '2026-09-20', concluido: false, progressoPercentual: 40,
    curso: CursoSchema.parse({
      id: 'learning-1', slug: 'curso-inscrito', titulo: 'Curso que frequento', descricao: 'Curso de outro autor.', autorId: 'other', totalHoras: 5,
      createdAt: '2026-09-20T10:00:00Z', updatedAt: '2026-09-20T10:00:00Z',
    }),
  }] });
});

describe('biblioteca pessoal de cursos', () => {
  it.each(['mentor', 'instituicao'] satisfies Role[])('separa criação e aprendizagem para %s', async (role) => {
    auth.role = role;
    const { router } = renderLibrary(`/app/${role}/meus-cursos`);
    expect(await screen.findByText('Curso que criei')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute('href', `/app/${role}/cursos/draft-1/editar`);
    expect(cursosApi.getMinhasInscricoes).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('link', { name: 'A frequentar' }));
    expect(await screen.findByText('Curso que frequento')).toBeVisible();
    expect(screen.getByText('40%')).toBeVisible();
    expect(screen.queryByText('Curso que criei')).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('?view=learning');
    expect(screen.getByRole('link', { name: 'Catálogo de cursos' })).toHaveAttribute('href', '/app/cursos');

    fireEvent.click(screen.getByRole('link', { name: 'Criados por mim' }));
    expect(await screen.findByText('Curso que criei')).toBeVisible();
    expect(screen.queryByText('Curso que frequento')).not.toBeInTheDocument();
  });

  it('mantém a aprendizagem do estudante mesmo com um parâmetro de criação', async () => {
    auth.role = 'estudante';
    renderLibrary('/app/meus-cursos?view=created');
    expect(await screen.findByText('Curso que frequento')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Criados por mim' })).not.toBeInTheDocument();
    expect(cursosApi.getMeus).not.toHaveBeenCalled();
  });

  it('distingue erro de carregamento de uma lista de inscrições vazia', async () => {
    vi.mocked(cursosApi.getMinhasInscricoes).mockRejectedValue(new Error('Unavailable'));
    renderLibrary('/app/instituicao/meus-cursos?view=learning');
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(screen.queryByText('Ainda não estás inscrito em nenhum curso.')).not.toBeInTheDocument();
  });

  it('mantém os cursos já carregados quando uma atualização falha', async () => {
    const { client } = renderLibrary('/app/instituicao/meus-cursos?view=learning');
    expect(await screen.findByText('Curso que frequento')).toBeVisible();
    vi.mocked(cursosApi.getMinhasInscricoes).mockRejectedValue(new Error('Unavailable'));
    await act(async () => { await client.invalidateQueries({ queryKey: ['cursos', 'me', 'inscricoes'] }); });
    expect(await screen.findByRole('status')).toHaveTextContent('Não foi possível atualizar');
    expect(screen.getByText('Curso que frequento')).toBeVisible();
  });
});
