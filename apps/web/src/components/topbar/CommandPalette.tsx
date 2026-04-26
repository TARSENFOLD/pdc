import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMMANDS = [
  { label: 'Início', to: '/app/home', group: 'Navegação' },
  { label: 'Feed de Mérito', to: '/app/feed', group: 'Navegação' },
  { label: 'Simulações', to: '/app/simulacoes', group: 'Navegação' },
  { label: 'Cursos', to: '/app/cursos', group: 'Navegação' },
  { label: 'Reputação', to: '/app/reputacao', group: 'Navegação' },
  { label: 'Perfil', to: '/app/perfil', group: 'Navegação' },
  { label: 'Configurações', to: '/app/configuracoes', group: 'Navegação' },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onOpenChange]);

  if (!open) return null;

  const filtered = query.length === 0
    ? COMMANDS
    : COMMANDS.filter(cmd => cmd.label.toLowerCase().includes(query.toLowerCase()));

  function handleSelect(to: string) {
    onOpenChange(false);
    navigate(to);
  }

  return (
    <div
      data-testid="command-palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => { onOpenChange(false); }}
      />
      <div className="relative w-full max-w-lg rounded-2xl border bg-elevated shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <Search size={16} className="text-ink-tertiary shrink-0" />
          <input
            ref={inputRef}
            data-testid="command-palette-input"
            type="text"
            placeholder="Procurar..."
            value={query}
            onChange={e => { setQuery(e.target.value); }}
            className="flex-1 bg-transparent text-sm text-ink-primary placeholder-ink-tertiary outline-none"
          />
          <button
            onClick={() => { onOpenChange(false); }}
            className="text-ink-tertiary hover:text-ink-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <ul className="max-h-64 overflow-y-auto py-2" role="listbox">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-ink-tertiary">Sem resultados</li>
          ) : (
            filtered.map(cmd => (
              <li key={cmd.to} role="option">
                <button
                  onClick={() => { handleSelect(cmd.to); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-secondary hover:text-ink-primary hover:bg-recessed transition-colors text-left"
                >
                  {cmd.label}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
