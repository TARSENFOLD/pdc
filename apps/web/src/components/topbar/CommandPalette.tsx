import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * CommandPalette - Paleta de comandos (Cmd+K).
 * Refactorizada para usar i18n e tokens canónicos.
 */
export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps): React.ReactElement | null {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const COMMANDS = [
    { label: t('nav.inicio', 'Início'), to: '/app/home' },
    { label: t('nav.feed', 'Feed de Mérito'), to: '/app/feed' },
    { label: t('nav.simulacoes', 'Simulações'), to: '/app/simulacoes' },
    { label: t('nav.cursos', 'Cursos'), to: '/app/cursos' },
    { label: t('nav.reputacao', 'Reputação'), to: '/app/reputacao' },
    { label: t('user_menu.profile', 'Perfil'), to: '/app/perfil' },
    { label: t('user_menu.settings', 'Configurações'), to: '/app/configuracoes' },
  ];

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
    return () => { document.removeEventListener('keydown', handleKey); };
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
      aria-label={t('command_palette.aria_label', 'Paleta de comandos')}
    >
      <div
        className="absolute inset-0 bg-[var(--glass-bg-dark)] backdrop-blur-[var(--glass-blur)] animate-in fade-in duration-300"
        onClick={() => { onOpenChange(false); }}
      />
      <div className="relative w-full max-w-lg rounded-[var(--radius-xl)] border border-[var(--glass-border-light)] bg-[var(--surface-elevated)] shadow-[var(--elevation-3)] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--glass-border-light)]">
          <Search size={16} className="text-[var(--ink-tertiary)] shrink-0" />
          <input
            ref={inputRef}
            data-testid="command-palette-input"
            type="text"
            placeholder={t('command_palette.placeholder', 'Procurar...')}
            value={query}
            onChange={e => { setQuery(e.target.value); }}
            className="flex-1 bg-transparent text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)] outline-none"
          />
          <button
            onClick={() => { onOpenChange(false); }}
            className="text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors p-1"
            aria-label={t('common.close', 'Fechar')}
          >
            <X size={16} />
          </button>
        </div>

        <ul className="max-h-64 overflow-y-auto py-2 scrollbar-none" role="listbox">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-[var(--ink-tertiary)] italic">
              {t('command_palette.no_results', 'Sem resultados')}
            </li>
          ) : (
            filtered.map(cmd => (
              <li key={cmd.to} role="option">
                <button
                  onClick={() => { handleSelect(cmd.to); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-recessed)] transition-all text-left min-h-[44px]"
                >
                  <span className="flex-1">{cmd.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
