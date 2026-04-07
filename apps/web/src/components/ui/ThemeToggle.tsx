import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeContext';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'icon' | 'full';
  className?: string;
}

export function ThemeToggle({ variant = 'icon', className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  if (variant === 'full') {
    return (
      <div className={cn("grid grid-cols-3 gap-1 rounded-xl bg-surface-raised p-1", className)}>
        <button
          type="button"
          onClick={() => { setTheme('light'); }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg py-4 text-xs font-semibold transition-all duration-200",
            theme === 'light' 
              ? "bg-surface text-accent shadow-sm ring-1 ring-border" 
              : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
          )}
        >
          <Sun size={20} />
          <span>Claro</span>
        </button>
        <button
          type="button"
          onClick={() => { setTheme('dark'); }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg py-4 text-xs font-semibold transition-all duration-200",
            theme === 'dark' 
              ? "bg-surface text-accent shadow-sm ring-1 ring-border" 
              : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
          )}
        >
          <Moon size={20} />
          <span>Escuro</span>
        </button>
        <button
          type="button"
          onClick={() => { setTheme('system'); }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg py-4 text-xs font-semibold transition-all duration-200",
            theme === 'system' 
              ? "bg-surface text-accent shadow-sm ring-1 ring-border" 
              : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
          )}
        >
          <Monitor size={20} />
          <span>Sistema</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-secondary transition-all hover:bg-surface hover:text-accent active:scale-95",
        className
      )}
      aria-label="Alternar tema"
    >
      <div className="relative h-5 w-5">
        <Sun className={cn("absolute inset-0 transition-all duration-300", theme === 'light' ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0")} size={20} />
        <Moon className={cn("absolute inset-0 transition-all duration-300", theme === 'dark' ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0")} size={20} />
        <Monitor className={cn("absolute inset-0 transition-all duration-300", theme === 'system' ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0")} size={20} />
      </div>
    </button>
  );
}
