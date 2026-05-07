import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RoleHomeShell from './RoleHomeShell';
import type { TodayMission } from './RoleHomeShell';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe('RoleHomeShell', () => {
  const mission: TodayMission = {
    label: 'Completar simulação',
    description: 'Continue de onde parou.',
    to: '/simulacoes/123',
    type: 'learning',
  };

  it('renders greeting', () => {
    render(
      <Wrapper>
        <RoleHomeShell greeting="Bom dia, Ana" mission={null} carousels={[]} />
      </Wrapper>,
    );
    expect(screen.getByText('Bom dia, Ana')).toBeDefined();
  });

  it('renders kicker when provided', () => {
    render(
      <Wrapper>
        <RoleHomeShell kicker="Estudante" greeting="Olá" mission={null} carousels={[]} />
      </Wrapper>,
    );
    expect(screen.getByText('Estudante')).toBeDefined();
  });

  it('renders mission when provided', () => {
    render(
      <Wrapper>
        <RoleHomeShell greeting="Olá" mission={mission} carousels={[]} />
      </Wrapper>,
    );
    expect(screen.getByText('Completar simulação')).toBeDefined();
    expect(screen.getByText('Continue de onde parou.')).toBeDefined();
  });

  it('does not render mission block when mission is null', () => {
    render(
      <Wrapper>
        <RoleHomeShell greeting="Olá" mission={null} carousels={[]} />
      </Wrapper>,
    );
    expect(screen.queryByText('Hoje')).toBeNull();
  });

  it('renders carousel sections', () => {
    const carousels = [
      { id: 'recent', title: 'Recentes', carousel: <div>carousel-1</div> },
      { id: 'reco', title: 'Recomendados', carousel: <div>carousel-2</div> },
    ];
    render(
      <Wrapper>
        <RoleHomeShell greeting="Olá" mission={null} carousels={carousels} />
      </Wrapper>,
    );
    expect(screen.getByText('Recentes')).toBeDefined();
    expect(screen.getByText('Recomendados')).toBeDefined();
    expect(screen.getByText('carousel-1')).toBeDefined();
  });

  it('forwards data-testid', () => {
    const { container } = render(
      <Wrapper>
        <RoleHomeShell greeting="Olá" mission={null} carousels={[]} data-testid="home" />
      </Wrapper>,
    );
    expect(container.querySelector('[data-testid="home"]')).not.toBeNull();
  });

  describe('dark mode', () => {
    beforeEach(() => { document.documentElement.classList.add('dark'); });
    afterEach(() => { document.documentElement.classList.remove('dark'); });

    it('renders in dark mode without crash', () => {
      render(
        <Wrapper>
          <RoleHomeShell greeting="Dark greeting" mission={null} carousels={[]} />
        </Wrapper>,
      );
      expect(screen.getByText('Dark greeting')).toBeDefined();
    });
  });
});
