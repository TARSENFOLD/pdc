import React, { useEffect, useState } from 'react';
import { ThemeContext, type Theme } from './theme-context';

const THEME_KEY = 'pdc:theme';
const LEGACY_THEME_KEY = 'pdc-theme';

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // 1. Migração one-shot
    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacy) {
      localStorage.setItem(THEME_KEY, legacy);
      localStorage.removeItem(LEGACY_THEME_KEY);
      return isTheme(legacy) ? legacy : 'dark';
    }

    // 2. Chave canónica
    const stored = localStorage.getItem(THEME_KEY);
    return isTheme(stored) ? stored : 'dark';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (t: Theme) => {
      let resolved: 'light' | 'dark' = 'dark';

      if (t === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        resolved = t;
      }

      setResolvedTheme(resolved);

      // Sincronização de classes (remove ambas primeiro para evitar duplicados)
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
    };

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => { applyTheme('system'); };
      mediaQuery.addEventListener('change', listener);
      return () => { mediaQuery.removeEventListener('change', listener); };
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
