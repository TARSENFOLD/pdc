import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuietBadge } from './QuietBadge';
import type { BadgeVariant } from '../Badge';

describe('QuietBadge', () => {
  it('renders children', () => {
    render(<QuietBadge>Status</QuietBadge>);
    expect(screen.getByText('Status')).toBeDefined();
  });

  it('applies variant classes', () => {
    const variants: BadgeVariant[] = ['success', 'error', 'warning', 'info', 'accent'];
    
    for (const variant of variants) {
      const { container, unmount } = render(<QuietBadge variant={variant}>x</QuietBadge>);
      const badge = container.querySelector('span');
      expect(badge?.className).toContain('border-');
      unmount();
    }
  });

  it('is rounded-full', () => {
    const { container } = render(<QuietBadge>x</QuietBadge>);
    expect(container.querySelector('span')?.className).toContain('rounded-full');
  });

  it('renders authority accent variant', () => {
    render(<QuietBadge variant="accent">Validado</QuietBadge>);
    expect(screen.getByText('Validado')).toBeDefined();
  });
});
