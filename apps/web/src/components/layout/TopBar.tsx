import { useState, useEffect } from 'react';
import type React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Menu, Command, MessageSquare } from 'lucide-react';
import { RoleChipMenu } from '@/components/topbar/RoleChipMenu';
import { NotificationsDropdown } from '@/components/topbar/NotificationsDropdown';
import CommandPalette from '@/components/topbar/CommandPalette';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

/**
 * TopBar - Barra superior do sistema.
 * Refactorizada para remover estilos inline e usar tokens canónicos via Tailwind.
 */
export default function TopBar({ onOpenMobileMenu }: TopBarProps): React.JSX.Element {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        // Guardrail: Não abrir se estiver num campo de texto
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target as HTMLElement).isContentEditable
        ) {
          return;
        }

        e.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => { document.removeEventListener('keydown', down); };
  }, []);

  return (
    <>
      <CommandPalette 
        open={isCommandPaletteOpen} 
        onOpenChange={setIsCommandPaletteOpen} 
      />
      
      <header
        data-testid="topbar"
        className="sticky top-0 z-30 flex min-h-14 w-full items-center justify-between px-4 bg-[var(--chrome-surface)] sm:px-6 lg:px-8"
      >
        {/* ── Esquerda: Logo Mobile + Breadcrumbs ── */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => { onOpenMobileMenu(); }}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--glass-border-light)] bg-[var(--surface-elevated)] text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink-primary)] lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[var(--ink-primary)]">{title}</div>
          </div>
        </div>

        {/* ── Centro: Busca Global (Cmd+K) ── */}
        <div className="hidden md:flex flex-1 max-w-sm mx-8">
          <button
            data-testid="command-palette-trigger"
            onClick={() => { setIsCommandPaletteOpen(true); }}
            className="relative w-full group text-left outline-none"
          >
            <div className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)]"
                size={14}
              />
              <div
                className="h-9 w-full rounded-lg border border-[var(--chrome-border)] bg-[var(--surface-canvas)] pl-9 pr-3 text-sm flex items-center justify-between text-[var(--ink-tertiary)] hover:border-[var(--ink-tertiary)] transition-colors"
              >
                <span className="text-xs">Search</span>
                <div
                  className="flex items-center gap-0.5 rounded border border-[var(--chrome-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink-tertiary)]"
                >
                  <Command className="h-2.5 w-2.5" /> K
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* ── Direita: Mensagens + Notificações + Perfil ── */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mensagens */}
          <Link
            to="/app/mensagens"
            className="relative flex items-center justify-center w-11 h-11 rounded-xl text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--chrome-surface-strong)] transition-colors min-h-[44px] min-w-[44px]"
            title="Mensagens"
          >
            <MessageSquare size={20} />
          </Link>

          {/* Notificações */}
          <NotificationsDropdown />

          {/* User Dropdown - Role Chip Menu (Unified) */}
          <RoleChipMenu />
        </div>
      </header>
    </>
  );
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const current = segments[1] ?? 'home';
  const titles: Record<string, string> = {
    home: 'Início',
    explorar: 'Explorar',
    cursos: 'Cursos',
    simulacoes: 'Simulações',
    experiencias: 'Experiências',
    programas: 'Programas',
    feed: 'Comunidade',
    mensagens: 'Mensagens',
    reputacao: 'Reputação',
    perfil: 'Perfil',
    configuracoes: 'Configurações',
  };
  return titles[current] ?? 'Área de trabalho';
}
