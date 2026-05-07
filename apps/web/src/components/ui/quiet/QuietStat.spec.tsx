import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuietStat } from './QuietStat';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe('QuietStat', () => {
  it('renders label and value', () => {
    render(<Wrapper><QuietStat label="XP" value={1200} /></Wrapper>);
    expect(screen.getByText('XP')).toBeDefined();
    // toLocaleString output is locale-dependent in jsdom; just check value is rendered
    expect(screen.getByText(/1.?200/)).toBeDefined();
  });

  it('renders string value', () => {
    render(<Wrapper><QuietStat label="Status" value="Ativo" /></Wrapper>);
    expect(screen.getByText('Ativo')).toBeDefined();
  });

  it('renders trend up', () => {
    render(<Wrapper><QuietStat label="XP" value={100} trend={{ delta: 5, direction: 'up' }} /></Wrapper>);
    expect(screen.getByText('+5%')).toBeDefined();
  });

  it('renders trend down', () => {
    render(<Wrapper><QuietStat label="XP" value={100} trend={{ delta: 3, direction: 'down' }} /></Wrapper>);
    expect(screen.getByText('-3%')).toBeDefined();
  });

  it('wraps in Link when href provided', () => {
    const { container } = render(
      <Wrapper><QuietStat label="XP" value={100} href="/perfil" /></Wrapper>,
    );
    expect(container.querySelector('a')).not.toBeNull();
  });

  it('does not render Link without href', () => {
    const { container } = render(<Wrapper><QuietStat label="XP" value={100} /></Wrapper>);
    expect(container.querySelector('a')).toBeNull();
  });

  it('forwards data-testid', () => {
    const { container } = render(
      <Wrapper><QuietStat label="XP" value={1} data-testid="xp-stat" /></Wrapper>,
    );
    expect(container.querySelector('[data-testid="xp-stat"]')).not.toBeNull();
  });

  describe('dark mode', () => {
    beforeEach(() => { document.documentElement.classList.add('dark'); });
    afterEach(() => { document.documentElement.classList.remove('dark'); });

    it('renders in dark mode without crash', () => {
      render(<Wrapper><QuietStat label="XP" value={500} /></Wrapper>);
      expect(screen.getByText('XP')).toBeDefined();
    });
  });
});
