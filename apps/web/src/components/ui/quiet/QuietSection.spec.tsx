import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuietSection } from './QuietSection';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe('QuietSection', () => {
  it('renders children', () => {
    render(<Wrapper><QuietSection>Content</QuietSection></Wrapper>);
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('renders title when provided', () => {
    render(<Wrapper><QuietSection title="Cursos">x</QuietSection></Wrapper>);
    expect(screen.getByText('Cursos')).toBeDefined();
  });

  it('renders kicker when provided', () => {
    render(<Wrapper><QuietSection kicker="Novo">x</QuietSection></Wrapper>);
    expect(screen.getByText('Novo')).toBeDefined();
  });

  it('renders action link when provided', () => {
    render(
      <Wrapper>
        <QuietSection action={{ label: 'Ver todos', to: '/cursos' }}>x</QuietSection>
      </Wrapper>,
    );
    expect(screen.getByRole('link', { name: 'Ver todos →' })).toBeDefined();
  });

  it('does not render header when no kicker/title/action', () => {
    const { container } = render(<Wrapper><QuietSection>just content</QuietSection></Wrapper>);
    // header row div should not be rendered
    expect(container.querySelector('.flex.items-center.justify-between')).toBeNull();
  });

  it('forwards data-testid to section', () => {
    const { container } = render(
      <Wrapper><QuietSection data-testid="sec">x</QuietSection></Wrapper>,
    );
    expect(container.querySelector('section[data-testid="sec"]')).not.toBeNull();
  });

  describe('dark mode', () => {
    beforeEach(() => { document.documentElement.classList.add('dark'); });
    afterEach(() => { document.documentElement.classList.remove('dark'); });

    it('renders in dark mode without crash', () => {
      render(<Wrapper><QuietSection title="Dark">Content</QuietSection></Wrapper>);
      expect(screen.getByText('Dark')).toBeDefined();
    });
  });
});
