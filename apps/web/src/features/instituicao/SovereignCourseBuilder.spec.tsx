import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CursoMeu, Pagination } from '@pdc/shared';
import { cursosApi } from '@/lib/api/cursos';
import { SovereignCourseBuilder } from './SovereignCourseBuilder';

vi.mock('@/lib/api/cursos', () => ({
  cursosApi: {
    create: vi.fn(),
    update: vi.fn(),
    getPreviewById: vi.fn(),
    updateEstado: vi.fn(),
  },
}));

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: { role: 'instituicao' } }),
}));

vi.mock('@/hooks/useToast', () => ({ toast: vi.fn() }));

vi.mock('@/components/builders', () => ({
  RichBuilderShell: ({ children, settingsPanel }: { children: ReactNode; settingsPanel: ReactNode }) => (
    <div>
      {settingsPanel}
      {children}
    </div>
  ),
  BuilderSection: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  BuilderActionsBar: ({ onSaveDraft }: { onSaveDraft: () => void }) => (
    <button type="button" onClick={onSaveDraft}>Guardar rascunho</button>
  ),
}));

vi.mock('./components/CourseBaseInfo', () => ({
  CourseBaseInfo: ({ register }: { register: (name: 'titulo' | 'descricao') => object }) => (
    <div>
      <input aria-label="Título do curso" {...register('titulo')} />
      <textarea aria-label="Descrição" {...register('descricao')} />
    </div>
  ),
}));

vi.mock('./components/CourseMeritGuard', () => ({ CourseMeritGuard: () => null }));
vi.mock('./components/CourseCurriculum', () => ({ CourseCurriculum: () => null }));
vi.mock('./components/CourseSettingsPanel', () => ({ CourseSettingsPanel: () => null }));
vi.mock('./components/CourseReviewPanel', () => ({ CourseReviewPanel: () => null }));
vi.mock('./components/CourseStepReadiness', () => ({ CourseStepReadiness: () => null }));

const savedCourse = {
  id: '24',
  slug: 'curso-guardado',
  titulo: 'Curso guardado',
  descricao: 'Descrição completa do curso guardado.',
  totalHoras: 0,
  estado: 'draft',
  autorId: '23',
} satisfies CursoMeu;

interface CachedCourses {
  data: CursoMeu[];
  pagination: Pagination;
}

describe('SovereignCourseBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cursosApi.create).mockResolvedValue(savedCourse);
  });

  it('mantém o criador no estúdio e torna o novo rascunho visível na listagem', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData<CachedCourses>(['cursos', 'meus'], {
      data: [],
      pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 },
    });
    const router = createMemoryRouter(
      [
        {
          path: '/app/instituicao/cursos/criar',
          element: <SovereignCourseBuilder />,
        },
        {
          path: '/app/instituicao/cursos/:id/editar',
          element: <p>Estúdio de edição</p>,
        },
      ],
      { initialEntries: ['/app/instituicao/cursos/criar'] }
    );

    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Título do curso' }), {
      target: { value: 'Curso guardado' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Descrição' }), {
      target: { value: 'Descrição completa do curso guardado.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar rascunho' }));

    await waitFor(() => expect(cursosApi.create).toHaveBeenCalledOnce());
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app/instituicao/cursos/24/editar');
    });
    expect(router.state.location.pathname).not.toBe('/app/instituicao/cursos');
    expect(client.getQueryData<CachedCourses>(['cursos', 'meus'])?.data).toEqual([savedCourse]);
  });
});
