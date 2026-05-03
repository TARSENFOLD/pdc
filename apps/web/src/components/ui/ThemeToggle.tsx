import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeContext';
import { Button } from './Button';

/**
 * ThemeToggle - Componente de UI para alternar entre temas.
 * Agora é puramente passivo, consumindo o ThemeContext.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Alternar para tema ${resolvedTheme === 'light' ? 'escuro' : 'claro'}`}
      className="flex h-11 w-11 items-center justify-center rounded-lg opacity-40 transition-opacity hover:opacity-80"
    >
      {resolvedTheme === 'light' ? (
        <Moon size={15} style={{ color: 'var(--ink-primary)' }} />
      ) : (
        <Sun size={15} style={{ color: 'var(--ink-primary)' }} />
      )}
    </button>
  );
}

/**
 * Versão simples (ícone único) para menus compactos.
 */
export function ThemeToggleSimple() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-11 w-11 px-0 rounded-xl"
      onClick={toggle}
      aria-label={`Alternar para tema ${resolvedTheme === 'light' ? 'escuro' : 'claro'}`}
    >
      {resolvedTheme === 'light' ? (
        <Sun size={20} className="text-ink-secondary" />
      ) : (
        <Moon size={20} className="text-ink-secondary" />
      )}
    </Button>
  );
}
