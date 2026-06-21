import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search, X, BookOpen, Zap, Building, User, Loader2 } from 'lucide-react';
import { catalogoApi } from '@/lib/api/catalogo';
import { useAuth } from '@/lib/auth/auth-context';
import { getCommandContentRoute, getNavCommands } from './command-palette-routes';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIPO_ICON: Record<string, React.ReactNode> = {
  curso: <BookOpen size={14} />,
  simulacao: <Zap size={14} />,
  experiencia: <Building size={14} />,
  mentor: <User size={14} />,
  instituicao: <Building size={14} />,
  perfil: <User size={14} />,
};

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => { setDebounced(value); }, ms);
    return () => { clearTimeout(id); };
  }, [value, ms]);
  return debounced;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps): React.ReactElement | null {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { user } = useAuth();
  const debouncedQuery = useDebounce(query.trim(), 300);

  const navCommands = getNavCommands(user?.role);
  const filteredNav = debouncedQuery.length === 0
    ? navCommands.slice(0, 6)
    : navCommands.filter((cmd) =>
        cmd.label.toLowerCase().includes(debouncedQuery.toLowerCase()),
      );

  const { data: contentData, isFetching } = useQuery({
    queryKey: ['command-palette-search', debouncedQuery],
    queryFn: () => catalogoApi.explorar({ search: debouncedQuery, pageSize: 6 }),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const contentItems = useMemo(
    () => debouncedQuery.length >= 2
      ? (contentData?.data ?? []).filter((item) => getCommandContentRoute(item.tipo) !== undefined)
      : [],
    [debouncedQuery, contentData],
  );
  const totalItems = filteredNav.length + contentItems.length;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => { inputRef.current?.focus(); }, 50);
    }
  }, [open]);

  useEffect(() => { setSelectedIndex(0); }, [debouncedQuery]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${String(selectedIndex)}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleSelect = useCallback((to: string) => {
    onOpenChange(false);
    navigate(to);
  }, [navigate, onOpenChange]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') { onOpenChange(false); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, totalItems - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const navItem = filteredNav[selectedIndex];
        if (navItem) { handleSelect(navItem.to); return; }
        const contentItem = contentItems[selectedIndex - filteredNav.length];
        if (contentItem) {
          const toFn = getCommandContentRoute(contentItem.tipo);
          if (toFn) handleSelect(toFn(contentItem.slug));
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); };
  }, [open, onOpenChange, selectedIndex, filteredNav, contentItems, totalItems, handleSelect]);

  if (!open) return null;

  const showContentSection = debouncedQuery.length >= 2;

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
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--glass-border-light)]">
          {isFetching
            ? <Loader2 size={16} className="text-[var(--ink-tertiary)] shrink-0 animate-spin" />
            : <Search size={16} className="text-[var(--ink-tertiary)] shrink-0" />
          }
          <input
            ref={inputRef}
            data-testid="command-palette-input"
            type="text"
            placeholder={t('command_palette.placeholder', 'Procurar páginas e conteúdo...')}
            value={query}
            onChange={(e) => { setQuery(e.target.value); }}
            className="flex-1 bg-transparent text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)] outline-none"
            aria-autocomplete="list"
            aria-controls="command-palette-list"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] text-[var(--ink-tertiary)] border border-[var(--glass-border-light)] rounded px-1.5 py-0.5">
            esc
          </kbd>
          <button
            onClick={() => { onOpenChange(false); }}
            className="text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t('common.close', 'Fechar')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <ul
          id="command-palette-list"
          ref={listRef}
          className="max-h-80 overflow-y-auto py-2 scrollbar-none"
          role="listbox"
          aria-label="Resultados"
        >
          {/* Nav section */}
          {filteredNav.length > 0 && (
            <>
              {showContentSection && (
                <li className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--ink-tertiary)]" role="presentation">
                  {t('command_palette.section_nav', 'Navegação')}
                </li>
              )}
              {filteredNav.map((cmd, i) => (
                <li key={cmd.to} role="option" aria-selected={selectedIndex === i}>
                  <button
                    data-idx={i}
                    onClick={() => { handleSelect(cmd.to); }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-all text-left min-h-[44px] ${
                      selectedIndex === i
                        ? 'bg-[var(--accent-primary)]/10 text-[var(--ink-primary)]'
                        : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-recessed)]'
                    }`}
                  >
                    <span className="flex-1">{cmd.label}</span>
                    {selectedIndex === i && (
                      <kbd className="text-[10px] text-[var(--ink-tertiary)] border border-[var(--glass-border-light)] rounded px-1.5 py-0.5">
                        ↵
                      </kbd>
                    )}
                  </button>
                </li>
              ))}
            </>
          )}

          {/* Content search section */}
          {showContentSection && (
            <>
              <li className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--ink-tertiary)] mt-1 border-t border-[var(--glass-border-light)]" role="presentation">
                {t('command_palette.section_content', 'Conteúdo')}
              </li>
              {isFetching && contentItems.length === 0 && (
                <li className="px-4 py-4 flex items-center gap-2 text-sm text-[var(--ink-tertiary)]" role="presentation">
                  <Loader2 size={14} className="animate-spin" />
                  {t('command_palette.searching', 'A pesquisar...')}
                </li>
              )}
              {!isFetching && contentItems.length === 0 && debouncedQuery.length >= 2 && (
                <li className="px-4 py-4 text-center text-sm text-[var(--ink-tertiary)] italic" role="presentation">
                  {t('command_palette.no_content', 'Nenhum conteúdo encontrado')}
                </li>
              )}
              {contentItems.map((item, i) => {
                const idx = filteredNav.length + i;
                const toFn = getCommandContentRoute(item.tipo);
                return (
                  <li key={item.id} role="option" aria-selected={selectedIndex === idx}>
                    <button
                      data-idx={idx}
                      onClick={() => { if (toFn) handleSelect(toFn(item.slug)); }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-all text-left min-h-[44px] ${
                        selectedIndex === idx
                          ? 'bg-[var(--accent-primary)]/10 text-[var(--ink-primary)]'
                          : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-recessed)]'
                      }`}
                    >
                      <span className="text-[var(--ink-tertiary)] shrink-0">
                        {TIPO_ICON[item.tipo]}
                      </span>
                      <span className="flex-1 truncate">{item.titulo}</span>
                      <span className="text-[11px] text-[var(--ink-tertiary)] capitalize shrink-0">
                        {item.tipo}
                      </span>
                    </button>
                  </li>
                );
              })}
            </>
          )}

          {/* Empty state: no nav results, no search */}
          {filteredNav.length === 0 && !showContentSection && (
            <li className="px-4 py-6 text-center text-sm text-[var(--ink-tertiary)] italic" role="presentation">
              {t('command_palette.no_results', 'Sem resultados')}
            </li>
          )}
        </ul>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[var(--glass-border-light)] flex items-center gap-3 text-[11px] text-[var(--ink-tertiary)]">
          <span><kbd className="font-mono">↑↓</kbd> navegar</span>
          <span><kbd className="font-mono">↵</kbd> seleccionar</span>
          <span><kbd className="font-mono">esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}
