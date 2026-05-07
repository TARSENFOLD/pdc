import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HUDPanel } from './HUDPanel';

describe('HUDPanel', () => {
  const mockProps = {
    phi: 0.85,
    resilience: 0.92,
    timer: '04:20',
    hesitation: 0.15,
  };

  it('renders core behavioral metrics', () => {
    render(<HUDPanel {...mockProps} />);
    expect(screen.getByText('0.85')).toBeDefined();
    expect(screen.getByText('0.92')).toBeDefined();
    expect(screen.getByText('04:20')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(<HUDPanel {...mockProps} className="custom-hud" />);
    expect(container.firstChild).toHaveProperty('className');
    expect((container.firstChild as HTMLElement).className).toContain('custom-hud');
  });

  it('displays sanity dual-layer indicator', () => {
    render(<HUDPanel {...mockProps} />);
    expect(screen.getByText(/Dual-Layer OK/i)).toBeDefined();
  });
});
