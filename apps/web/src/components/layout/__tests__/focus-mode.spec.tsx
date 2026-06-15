import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import FocusHeader from '../FocusHeader';
import FocusModeProvider from '../FocusModeProvider';
import { getFocusRouteTitle, isFocusMode } from '../focus-routes';
import { useFocusHeader } from '../useFocusHeader';

function RegisteredHeader(): null {
  useFocusHeader({
    title: 'Título registado',
    progress: <span>Etapa 2 de 4</span>,
    actions: <button type="button">Guardar</button>,
  });
  return null;
}

describe('focus mode routes', () => {
  it.each([
    '/app/projetos/novo',
    '/app/projetos/projeto-1/editar',
    '/app/mentor/cursos/criar',
    '/app/instituicao/simulacoes/sim-1/editar',
  ])('ativa focus mode para %s', (pathname) => {
    expect(isFocusMode(pathname)).toBe(true);
  });

  it.each([
    '/app/projetos',
    '/app/projetos/projeto-1',
    '/app/projetos/novo/extra',
    '/app/mentor/cursos',
    '/app/home',
  ])('não ativa focus mode fora dos builders em %s', (pathname) => {
    expect(isFocusMode(pathname)).toBe(false);
  });
});

describe('FocusHeader', () => {
  it('deriva título da rota e fornece voltar por histórico sem registo', () => {
    render(
      <MemoryRouter initialEntries={['/app/projetos/novo']}>
        <FocusModeProvider>
          <FocusHeader />
        </FocusModeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Criar projeto' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeDefined();
  });

  it('renderiza título, progresso e ações registados pela página', async () => {
    render(
      <MemoryRouter initialEntries={['/app/projetos/novo']}>
        <FocusModeProvider>
          <FocusHeader />
          <RegisteredHeader />
        </FocusModeProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Título registado' })).toBeDefined();
    expect(screen.getAllByText('Etapa 2 de 4')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDefined();
  });

  it('mantém fallback seguro para uma rota de foco desconhecida', () => {
    expect(getFocusRouteTitle('/app/foco/desconhecido')).toBe('Modo de foco');
  });
});
