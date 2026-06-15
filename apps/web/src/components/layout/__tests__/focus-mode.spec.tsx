import { useMemo } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import FocusHeader from '../FocusHeader';
import FocusModeProvider from '../FocusModeProvider';
import { getFocusRouteTitle, isFocusMode } from '../focus-routes';
import { useFocusHeader } from '../useFocusHeader';
import { LegacyMentorSimulacaoEditRedirect } from '@/features/simulacoes/LegacyMentorSimulacaoEditRedirect';

function RegisteredHeader(): null {
  const header = useMemo(() => ({
    title: 'Título registado',
    progress: <span>Etapa 2 de 4</span>,
    actions: <button type="button">Guardar</button>,
  }), []);
  useFocusHeader(header);
  return null;
}

function CurrentLocation(): React.ReactElement {
  const location = useLocation();
  return <output>{location.pathname}</output>;
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

  it('preserva o id ao redirecionar a edição legada de Simulação', () => {
    render(
      <MemoryRouter initialEntries={['/app/mentor/simulacoes/editar/sim-1']}>
        <Routes>
          <Route path="/app/mentor/simulacoes/editar/:id" element={<LegacyMentorSimulacaoEditRedirect />} />
          <Route path="/app/mentor/simulacoes/:id/editar" element={<CurrentLocation />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('/app/mentor/simulacoes/sim-1/editar')).toBeDefined();
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
