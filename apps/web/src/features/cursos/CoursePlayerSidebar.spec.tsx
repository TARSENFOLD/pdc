import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Curso } from '@pdc/shared';
import { CoursePlayerSidebar } from './CoursePlayerSidebar';

const curso: Curso = {
  id: 'curso-1',
  slug: 'curso-teste',
  titulo: 'Curso de teste',
  descricao: 'Descrição completa do curso de teste.',
  autorId: 'mentor-1',
  totalHoras: 1,
  estado: 'published',
  rating: 0,
  inscritosCount: 0,
  createdAt: '2026-09-07T12:00:00.000Z',
  updatedAt: '2026-09-07T12:00:00.000Z',
  modulos: [
    {
      id: 'modulo-1',
      titulo: 'Introdução',
      ordem: 1,
      itens: [{ id: 'item-1', titulo: 'Boas-vindas', tipo: 'texto', ordem: 1 }],
    },
  ],
};

function renderSidebar(mobileOpen: boolean): void {
  render(
    <CoursePlayerSidebar
      curso={curso}
      progresso={[]}
      mobileOpen={mobileOpen}
      collapsed={false}
      onCloseMobile={vi.fn()}
      onCollapse={vi.fn()}
      onOpenOverview={vi.fn()}
      onOpenItem={vi.fn()}
    />
  );
}

describe('CoursePlayerSidebar', () => {
  it('remove a navegação móvel fechada do foco sem ocultar a versão desktop', () => {
    renderSidebar(false);

    expect(
      screen.getByRole('complementary', { name: 'Navegação do curso', hidden: true })
    ).toHaveClass('invisible', 'lg:visible');
  });

  it('torna a navegação móvel visível quando é aberta', () => {
    renderSidebar(true);

    expect(screen.getByRole('dialog', { name: 'Navegação do curso' })).toHaveClass(
      'visible',
      'translate-x-0'
    );
  });
});
