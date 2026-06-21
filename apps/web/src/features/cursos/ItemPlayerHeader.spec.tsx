import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import FocusHeader from '@/components/layout/FocusHeader';
import FocusModeProvider from '@/components/layout/FocusModeProvider';
import { ItemPlayerHeader } from './ItemPlayerHeader';

describe('ItemPlayerHeader', () => {
  it('regista título, progresso e ações no FocusHeader partilhado', async () => {
    const onOpenCurriculum = vi.fn();
    const onComplete = vi.fn();

    render(
      <MemoryRouter initialEntries={['/app/cursos/curso-1/player/mod-1/item-1']}>
        <FocusModeProvider>
          <FocusHeader />
          <ItemPlayerHeader
            cursoId="curso-1"
            title="Aula de abertura"
            completedCount={2}
            totalCount={5}
            progressPercent={40}
            concluded={false}
            pending={false}
            onOpenCurriculum={onOpenCurriculum}
            onComplete={onComplete}
          />
        </FocusModeProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Aula de abertura' })).toBeDefined();
    expect(screen.getAllByText('2/5')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir currículo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));

    expect(onOpenCurriculum).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('bloqueia conclusão quando o item já está concluído', async () => {
    render(
      <MemoryRouter>
        <FocusModeProvider>
          <FocusHeader />
          <ItemPlayerHeader
            cursoId="curso-1"
            title="Aula concluída"
            completedCount={1}
            totalCount={1}
            progressPercent={100}
            concluded
            pending={false}
            onOpenCurriculum={vi.fn()}
            onComplete={vi.fn()}
          />
        </FocusModeProvider>
      </MemoryRouter>,
    );

    const button = await screen.findByRole('button', { name: 'Concluído' });
    expect(button.getAttribute('disabled')).not.toBeNull();
  });
});
