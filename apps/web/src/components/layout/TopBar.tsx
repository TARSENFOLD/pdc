import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
export function TopBar({ onOpenMobileMenu }: TopBarProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

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
        className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[var(--glass-border-light)] px-4 backdrop-blur-[var(--glass-blur)] bg-[var(--surface-overlay)] sm:px-6 lg:px-8"
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
        </div>

        {/* ── Centro: Busca Global (Cmd+K) ── */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <button
            data-testid="command-palette-trigger"
            onClick={() => { setIsCommandPaletteOpen(true); }}
            className="relative w-full group text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-terracotta)] rounded-xl"
          >
            <div className="relative w-full">
              <Search 
                className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors text-[var(--ink-tertiary)] group-hover:text-[var(--accent-terracotta)]" 
                size={16} 
              />
              <div
                className="h-11 w-full rounded-xl border border-[var(--glass-border-light)] bg-[var(--surface-recessed)] pl-10 pr-4 text-sm transition-all flex items-center justify-between text-[var(--ink-tertiary)] hover:border-[var(--accent-terracotta-glow)]"
              >
                <span>Procurar carreiras ou rotas...</span>
                <div 
                  className="flex items-center gap-1 rounded-md border border-[var(--glass-border-light)] bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[10px] font-medium"
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
            className="relative flex items-center justify-center w-11 h-11 rounded-xl text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-recessed)] transition-colors min-h-[44px] min-w-[44px]"
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
