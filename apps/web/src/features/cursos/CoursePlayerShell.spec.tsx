import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Curso } from '@pdc/shared';
import { CoursePlayerShell } from './CoursePlayerShell';

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

function Harness(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Abrir currículo
      </button>
      <CoursePlayerShell
        curso={curso}
        progresso={[]}
        mobileOpen={open}
        collapsed={false}
        onCloseMobile={() => {
          setOpen(false);
        }}
        onCollapse={vi.fn()}
        onExpand={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenItem={vi.fn()}
      >
        <main>Conteúdo</main>
      </CoursePlayerShell>
    </>
  );
}

describe('CoursePlayerShell', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gere o foco como diálogo móvel e devolve-o ao controlo de abertura', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Abrir currículo' });

    opener.focus();
    fireEvent.click(opener);
    const dialog = await screen.findByRole('dialog', { name: 'Navegação do curso' });
    const close = screen.getAllByRole('button', { name: 'Fechar currículo' })[0];
    await waitFor(() => {
      expect(close).toHaveFocus();
    });
    expect(screen.getByText('Conteúdo').parentElement).toHaveAttribute('inert');

    opener.focus();
    expect(close).toHaveFocus();

    const last = screen.getByRole('button', { name: /Boas-vindas/ });
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(dialog.querySelector('button')).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(opener).toHaveFocus();
    });
    expect(screen.queryByRole('dialog', { name: 'Navegação do curso' })).toBeNull();
  });

  it('fecha o diálogo móvel quando a janela passa para desktop', async () => {
    const listeners = new Set<() => void>();
    const mediaQuery = {
      matches: false,
      media: '(min-width: 1024px)',
      onchange: null,
      addEventListener: vi.fn((_event: string, listener: () => void) => {
        listeners.add(listener);
      }),
      removeEventListener: vi.fn((_event: string, listener: () => void) => {
        listeners.delete(listener);
      }),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mediaQuery)
    );
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir currículo' }));
    expect(await screen.findByRole('dialog', { name: 'Navegação do curso' })).toBeVisible();

    mediaQuery.matches = true;
    listeners.forEach((listener) => {
      listener();
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Navegação do curso' })).not.toBeInTheDocument();
    });
    expect(screen.getByText('Conteúdo').parentElement).not.toHaveAttribute('inert');
  });
});
