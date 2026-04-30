import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WelcomeMat from './WelcomeMat';

describe('WelcomeMat', () => {
  beforeEach(() => { localStorage.clear(); });

  it('renders title', () => {
    render(<WelcomeMat title="Bem-vindo ao PDC" />);
    expect(screen.getByText('Bem-vindo ao PDC')).toBeDefined();
  });

  it('renders description when provided', () => {
    render(<WelcomeMat title="T" description="Comece por aqui." />);
    expect(screen.getByText('Comece por aqui.')).toBeDefined();
  });

  it('renders actions slot', () => {
    render(<WelcomeMat title="T" actions={<button>Começar</button>} />);
    expect(screen.getByRole('button', { name: 'Começar' })).toBeDefined();
  });

  it('does not show dismiss button when dismissable=false', () => {
    render(<WelcomeMat title="T" />);
    expect(screen.queryByRole('button', { name: 'Dispensar' })).toBeNull();
  });

  it('shows dismiss button when dismissable=true', () => {
    render(<WelcomeMat title="T" dismissable />);
    expect(screen.getByRole('button', { name: 'Dispensar' })).toBeDefined();
  });

  it('sets dismissed state when dismiss button clicked', () => {
    render(<WelcomeMat title="Bem-vindo" dismissable storageKey="test-dismiss" />);
    const dismissBtn = screen.getByRole('button', { name: 'Dispensar' });
    expect(dismissBtn).toBeDefined();

    fireEvent.click(dismissBtn);

    // localStorage is set immediately on click (the dismiss effect fires)
    expect(localStorage.getItem('pdc:welcome-mat-dismissed:test-dismiss')).toBe('true');
  });

  it('persists dismissed state in localStorage', () => {
    render(<WelcomeMat title="T" dismissable storageKey="home" />);
    fireEvent.click(screen.getByRole('button', { name: 'Dispensar' }));
    expect(localStorage.getItem('pdc:welcome-mat-dismissed:home')).toBe('true');
  });

  it('starts dismissed if localStorage key is set', () => {
    localStorage.setItem('pdc:welcome-mat-dismissed:home', 'true');
    render(<WelcomeMat title="Bem-vindo" dismissable storageKey="home" />);
    expect(screen.queryByText('Bem-vindo')).toBeNull();
  });

  it('forwards data-testid', () => {
    const { container } = render(<WelcomeMat title="T" data-testid="wmat" />);
    expect(container.querySelector('[data-testid="wmat"]')).not.toBeNull();
  });

  describe('dark mode', () => {
    beforeEach(() => { document.documentElement.classList.add('dark'); });
    afterEach(() => { document.documentElement.classList.remove('dark'); });

    it('renders in dark mode without crash', () => {
      render(<WelcomeMat title="Dark welcome" />);
      expect(screen.getByText('Dark welcome')).toBeDefined();
    });
  });
});
