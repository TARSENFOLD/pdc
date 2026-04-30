import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuietHero } from './QuietHero';

describe('QuietHero', () => {
  it('renders title', () => {
    render(<QuietHero title="Bem-vindo" />);
    expect(screen.getByText('Bem-vindo')).toBeDefined();
  });

  it('does not render kicker when omitted', () => {
    render(<QuietHero title="Title" />);
    expect(screen.queryByTestId('quiet-hero-kicker')).toBeNull();
  });

  it('renders kicker when provided', () => {
    render(<QuietHero kicker="Fase 1" title="Title" />);
    expect(screen.getByText('Fase 1')).toBeDefined();
  });

  it('renders description when provided', () => {
    render(<QuietHero title="T" description="Desc text" />);
    expect(screen.getByText('Desc text')).toBeDefined();
  });

  it('renders actions slot', () => {
    render(<QuietHero title="T" actions={<button>CTA</button>} />);
    expect(screen.getByRole('button', { name: 'CTA' })).toBeDefined();
  });

  it('forwards data-testid to h1', () => {
    const { container } = render(<QuietHero title="T" data-testid="hero" />);
    expect(container.querySelector('[data-testid="hero"]')?.tagName).toBe('H1');
  });

  it('falls back to data-testid=page-hero-title when not provided', () => {
    const { container } = render(<QuietHero title="T" />);
    expect(container.querySelector('[data-testid="page-hero-title"]')).not.toBeNull();
  });

  describe('dark mode', () => {
    beforeEach(() => { document.documentElement.classList.add('dark'); });
    afterEach(() => { document.documentElement.classList.remove('dark'); });

    it('renders in dark mode without crash', () => {
      render(<QuietHero title="Dark title" kicker="k" description="d" />);
      expect(screen.getByText('Dark title')).toBeDefined();
    });
  });
});
