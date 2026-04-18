import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from './Button';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // 1. Check local storage
    const saved = localStorage.getItem('pdc:theme');
    if (saved === 'light' || saved === 'dark') return saved;

    // 2. Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';

    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('pdc:theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-9 h-9 px-0"
      onClick={() => { toggleTheme(); }}
      aria-label="Alternar tema"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
