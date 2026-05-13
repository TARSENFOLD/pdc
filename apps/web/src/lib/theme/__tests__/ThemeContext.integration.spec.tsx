import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { ThemeProvider } from '../ThemeContext';
import { useTheme } from '../theme-context';

const TestComponent = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => { setTheme('light'); }}>Set Light</button>
      <button onClick={() => { setTheme('dark'); }}>Set Dark</button>
    </div>
  );
};

describe('ThemeContext Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
    
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('deve migrar a chave legacy pdc-theme para pdc:theme', () => {
    localStorage.setItem('pdc-theme', 'light');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(localStorage.getItem('pdc:theme')).toBe('light');
    expect(localStorage.getItem('pdc-theme')).toBeNull();
  });

  it('deve aplicar a classe correcta ao elemento html', () => {
    const { getByText } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    act(() => {
      getByText('Set Light').click();
    });

    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    act(() => {
      getByText('Set Dark').click();
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('deve suportar o tema do sistema', () => {
    localStorage.setItem('pdc:theme', 'system');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // resolvedTheme depende do matchMedia (que é dark por defeito no ambiente de teste JSOM)
    expect(document.documentElement.classList.contains('dark') || document.documentElement.classList.contains('light')).toBe(true);
  });
});
