import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { QuietEmpty } from './QuietEmpty';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe('QuietEmpty', () => {
  it('renders message', () => {
    render(<Wrapper><QuietEmpty icon={Inbox} message="Sem resultados" /></Wrapper>);
    expect(screen.getByText('Sem resultados')).toBeDefined();
  });

  it('renders action link when provided', () => {
    render(
      <Wrapper>
        <QuietEmpty icon={Inbox} message="Empty" action={{ label: 'Criar', to: '/criar' }} />
      </Wrapper>,
    );
    expect(screen.getByRole('link', { name: 'Criar' })).toBeDefined();
  });

  it('does not render link when action is omitted', () => {
    render(<Wrapper><QuietEmpty icon={Inbox} message="Empty" /></Wrapper>);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('forwards data-testid', () => {
    const { container } = render(
      <Wrapper><QuietEmpty icon={Inbox} message="x" data-testid="empty" /></Wrapper>,
    );
    expect(container.querySelector('[data-testid="empty"]')).not.toBeNull();
  });

  describe('dark mode', () => {
    beforeEach(() => { document.documentElement.classList.add('dark'); });
    afterEach(() => { document.documentElement.classList.remove('dark'); });

    it('renders in dark mode without crash', () => {
      render(<Wrapper><QuietEmpty icon={Inbox} message="Dark empty" /></Wrapper>);
      expect(screen.getByText('Dark empty')).toBeDefined();
    });
  });
});
