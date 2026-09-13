import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import FocusHeader from '@/components/layout/FocusHeader';
import FocusModeProvider from '@/components/layout/FocusModeProvider';
import BuilderSection from './BuilderSection';
import RichBuilderShell from './RichBuilderShell';

describe('RichBuilderShell', () => {
  it('renderiza stepper, conteúdo central e painel de definições', async () => {
    render(
      <MemoryRouter>
        <FocusModeProvider>
          <FocusHeader />
          <RichBuilderShell
            title="Criar conteúdo"
            steps={[
              { id: 'identidade', label: 'Identidade' },
              { id: 'conteudo', label: 'Conteúdo' },
            ]}
            settingsPanel={<div>Definições editoriais</div>}
          >
            <BuilderSection value="identidade" title="Identidade" description="Dados principais">
              <div>Editor de identidade</div>
            </BuilderSection>
            <BuilderSection value="conteudo" title="Conteúdo" description="Estrutura">
              <div>Editor de conteúdo</div>
            </BuilderSection>
          </RichBuilderShell>
        </FocusModeProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('navigation', { name: 'Etapas de criação' })).toBeTruthy();
    expect(screen.getByText('Editor de identidade')).toBeTruthy();
    expect(screen.getByText('Definições editoriais')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Conteúdo/ }));

    expect(screen.getByText('Editor de conteúdo')).toBeTruthy();
    expect(screen.queryByText('Editor de identidade')).toBeNull();
    expect(screen.getByRole('button', { name: 'Seguinte' })).toBeDisabled();
  });

  it('renderiza conteúdo e definições sem navegação quando não há etapas', () => {
    render(
      <RichBuilderShell
        title="Editor vazio"
        steps={[]}
        activeStep="inexistente"
        settingsPanel={<div>Definições disponíveis</div>}
      >
        <div>Conteúdo disponível</div>
      </RichBuilderShell>
    );

    expect(screen.queryByRole('navigation', { name: 'Etapas de criação' })).toBeNull();
    expect(screen.queryByText('Conteúdo disponível')).toBeTruthy();
    expect(screen.queryByText('Definições disponíveis')).toBeTruthy();
  });

  it('não infere etapas concluídas quando completedSteps é fornecido vazio', async () => {
    render(
      <MemoryRouter>
        <FocusModeProvider>
          <FocusHeader />
          <RichBuilderShell
            title="Criar conteúdo"
            activeStep="conteudo"
            completedSteps={[]}
            steps={[
              { id: 'identidade', label: 'Identidade' },
              { id: 'conteudo', label: 'Conteúdo' },
            ]}
            settingsPanel={<div>Definições editoriais</div>}
          >
            <BuilderSection value="identidade" title="Identidade" description="Dados principais">
              <div>Editor de identidade</div>
            </BuilderSection>
            <BuilderSection value="conteudo" title="Conteúdo" description="Estrutura">
              <div>Editor de conteúdo</div>
            </BuilderSection>
          </RichBuilderShell>
        </FocusModeProvider>
      </MemoryRouter>
    );

    const firstStep = await screen.findByRole('button', { name: /Identidade/ });
    expect(within(firstStep).getByText('1')).toBeVisible();
  });
});
