import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuietCard } from './QuietCard';

describe('QuietCard', () => {
  it('renders children', () => {
    render(<QuietCard>Hello</QuietCard>);
    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('forwards data-testid', () => {
    const { container } = render(<QuietCard data-testid="my-card">x</QuietCard>);
    expect(container.querySelector('[data-testid="my-card"]')).not.toBeNull();
  });

  describe('padding variants', () => {
    it.each(['sm', 'md', 'lg'] as const)('renders padding=%s without crash', (padding) => {
      const { container } = render(<QuietCard padding={padding}>x</QuietCard>);
      expect(container.firstChild).not.toBeNull();
    });
  });

  describe('tone variants', () => {
    it.each(['neutral', 'recessed', 'elevated'] as const)('renders tone=%s without crash', (tone) => {
      const { container } = render(<QuietCard tone={tone}>x</QuietCard>);
      expect(container.firstChild).not.toBeNull();
    });
  });

  describe('dark mode', () => {
    beforeEach(() => { document.documentElement.classList.add('dark'); });
    afterEach(() => { document.documentElement.classList.remove('dark'); });

    it('renders without crash in dark mode', () => {
      render(<QuietCard>Dark</QuietCard>);
      expect(screen.getByText('Dark')).toBeDefined();
    });
  });
});
