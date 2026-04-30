import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth/AuthContext';
import { 
  User, LogOut, Settings, ChevronDown, 
  HelpCircle, UserCircle, LayoutGrid
} from 'lucide-react';
import { Roles } from '@pdc/shared';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LangSwitcher } from '@/components/topbar/LangSwitcher';

/**
 * RoleChipMenu (User Menu Unificado)
 * Centraliza o perfil, configurações, tema, idioma e logout.
 */
export function RoleChipMenu() {
  const { user, logout } = useAuth();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  // Navegação por teclado
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); };
  }, [open]);

  if (!user) return null;

  const roleEntry = Roles[user.role];
  const lang = i18n.language as keyof typeof roleEntry;
  const roleLabel = roleEntry[lang] || roleEntry['pt-PT'];

  return (
    <div ref={ref} className="relative">
      <button
        data-testid="user-menu"
        onClick={() => { setOpen(o => !o); }}
        className="flex h-11 items-center gap-2 rounded-xl border border-[var(--glass-border-light)] px-3 transition-all hover:bg-[var(--surface-elevated)] min-w-[44px]"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Menu do utilizador"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-recessed)] text-[var(--accent-terracotta)]">
          <User size={14} />
        </div>
        <span className="hidden sm:block text-xs font-semibold text-[var(--ink-secondary)]">
          {roleLabel}
        </span>
        <ChevronDown size={12} className={`text-[var(--ink-tertiary)] transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-[var(--radius-xl)] border border-[var(--glass-border-light)] bg-[var(--surface-elevated)] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200"
          role="menu"
        >
          {/* Cabeçalho: Identidade */}
          <div className="px-5 py-4 border-b border-[var(--glass-border-light)]">
            <p className="text-sm font-bold text-[var(--ink-primary)] truncate">{user.nome}</p>
            <p className="text-xs text-[var(--ink-tertiary)] truncate">{user.email}</p>
          </div>

          <div className="p-2 space-y-1">
            <button
              role="menuitem"
              onClick={() => { setOpen(false); navigate('/app/perfil'); }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-recessed)] rounded-xl transition-colors"
            >
              <UserCircle size={16} className="text-[var(--accent-terracotta)]" /> 
              <span>O meu Perfil</span>
            </button>
            
            <button
              role="menuitem"
              onClick={() => { setOpen(false); navigate('/app/configuracoes'); }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-recessed)] rounded-xl transition-colors"
            >
              <Settings size={16} className="text-[var(--ink-tertiary)]" /> 
              <span>Configurações</span>
            </button>
          </div>

          {/* Secção: Preferências (Inline) */}
          <div className="px-3 py-3 border-t border-[var(--glass-border-light)] bg-[var(--surface-recessed)] space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-1 text-xs font-semibold text-[var(--ink-tertiary)]">
                <LayoutGrid size={12} />
                <span>Aspeto</span>
              </div>
              <ThemeToggle />
            </div>
            
            <LangSwitcher />
          </div>

          <div className="p-2 space-y-1 border-t border-[var(--glass-border-light)]">
            <button
              role="menuitem"
              onClick={() => { setOpen(false); navigate('/app/ajuda'); }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-recessed)] rounded-xl transition-colors"
            >
              <HelpCircle size={16} className="text-[var(--ink-tertiary)]" /> 
              <span>Ajuda & Suporte</span>
            </button>

            <button
              role="menuitem"
              onClick={() => { setOpen(false); void logout(); }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/5 rounded-xl transition-colors mt-1"
            >
              <LogOut size={16} /> 
              <span>Sair do PDC</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
