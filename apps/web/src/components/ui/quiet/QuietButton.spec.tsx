import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuietButton from './QuietButton';

describe('QuietButton', () => {
  it('renders children', () => {
    render(<QuietButton variant="primary">Click me</QuietButton>);
    expect(screen.getByText('Click me')).toBeDefined();
  });

  it('forwards data-testid', () => {
    const { container } = render(
      <QuietButton variant="primary" data-testid="btn">Go</QuietButton>,
    );
    expect(container.querySelector('[data-testid="btn"]')).not.toBeNull();
  });

  describe('variant classes', () => {
    it.each(['primary', 'secondary', 'ghost', 'hero'] as const)(
      'renders variant=%s without crash',
      (variant) => {
        const { container } = render(<QuietButton variant={variant}>x</QuietButton>);
        expect(container.querySelector('button')).not.toBeNull();
      },
    );
  });

  describe('size classes', () => {
    it.each(['sm', 'md', 'lg'] as const)('renders size=%s without crash', (size) => {
      render(<QuietButton variant="primary" size={size}>x</QuietButton>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDefined();
    });

    it('touch target ≥44px on size=sm', () => {
      render(<QuietButton variant="primary" size="sm">x</QuietButton>);
      const btn = screen.getByRole('button');
      // h-11 = 44px — verified via class presence
      expect(btn.className).toContain('h-11');
    });

    it('touch target ≥44px on size=md', () => {
      render(<QuietButton variant="primary" size="md">x</QuietButton>);
      expect(screen.getByRole('button').className).toContain('h-11');
    });

    it('touch target ≥44px on size=lg', () => {
      render(<QuietButton variant="primary" size="lg">x</QuietButton>);
      expect(screen.getByRole('button').className).toContain('h-14');
    });
  });

  it('shows spinner when isLoading', () => {
    const { container } = render(
      <QuietButton variant="primary" isLoading>Save</QuietButton>,
    );
    expect(container.querySelector('.animate-spin')).not.toBeNull();
    expect(screen.queryByText('Save')).toBeNull();
  });

  it('is disabled when isLoading', () => {
    render(<QuietButton variant="primary" isLoading>x</QuietButton>);
    expect(screen.getByRole('button')).toHaveProperty('disabled', true);
  });

  it('hero variant has asymmetric border radius', () => {
    render(<QuietButton variant="hero">Publicar</QuietButton>);
    expect(screen.getByRole('button').className).toContain('rounded-[18px_6px_18px_6px]');
  });

  it('non-hero variants have rounded-[10px] class', () => {
    render(<QuietButton variant="primary">Go</QuietButton>);
    expect(screen.getByRole('button').className).toContain('rounded-[10px]');
  });

  describe('dark mode', () => {
    beforeEach(() => { document.documentElement.classList.add('dark'); });
    afterEach(() => { document.documentElement.classList.remove('dark'); });

    it('renders all variants in dark mode without crash', () => {
      for (const variant of ['primary', 'secondary', 'ghost', 'hero'] as const) {
        const { unmount } = render(<QuietButton variant={variant}>x</QuietButton>);
        expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
        unmount();
      }
    });
  });
});
