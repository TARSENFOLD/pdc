import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeContext';
import { Button } from './Button';

/**
 * ThemeToggle - Componente de UI para alternar entre temas.
 * Agora é puramente passivo, consumindo o ThemeContext.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-xl bg-[var(--surface-recessed)] p-1 border border-[var(--glass-border-light)]">
      <Button
        variant={theme === 'light' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8 w-8 px-0 rounded-lg hover:bg-[var(--surface-elevated)]"
        onClick={() => { setTheme('light'); }}
        aria-label="Tema Claro"
        title="Tema Claro"
      >
        <Sun size={14} className={theme === 'light' ? 'text-[var(--accent-terracotta)]' : 'text-[var(--ink-tertiary)]'} />
      </Button>
      
      <Button
        variant={theme === 'dark' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8 w-8 px-0 rounded-lg hover:bg-[var(--surface-elevated)]"
        onClick={() => { setTheme('dark'); }}
        aria-label="Tema Escuro"
        title="Tema Escuro"
      >
        <Moon size={14} className={theme === 'dark' ? 'text-[var(--accent-terracotta)]' : 'text-[var(--ink-tertiary)]'} />
      </Button>

      <Button
        variant={theme === 'system' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8 w-8 px-0 rounded-lg hover:bg-[var(--surface-elevated)]"
        onClick={() => { setTheme('system'); }}
        aria-label="Tema do Sistema"
        title="Tema do Sistema"
      >
        <Laptop size={14} className={theme === 'system' ? 'text-[var(--accent-terracotta)]' : 'text-[var(--ink-tertiary)]'} />
      </Button>
    </div>
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
