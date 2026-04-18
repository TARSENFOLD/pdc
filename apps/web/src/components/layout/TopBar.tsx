import { useAuth } from '@/lib/auth/AuthContext';
import { Search, Bell, Menu, UserCircle, Settings, LogOut, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

export function TopBar({ onOpenMobileMenu }: TopBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* ── Esquerda: Logo Mobile + Breadcrumbs ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileMenu}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-alt text-text-secondary hover:text-text-primary lg:hidden"
        >
          <Menu size={18} />
        </button>
        
        <div className="hidden lg:block">
          <p className="text-xs font-medium text-text-muted uppercase tracking-widest">
            {user?.role === 'aluno' ? 'Painel do Estudante' : 'Plataforma de Decisão'}
          </p>
        </div>
      </div>

      {/* ── Centro: Busca Global (Cmd+K) ── */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-amber transition-colors" size={16} />
          <input
            type="text"
            placeholder="Procurar carreiras, mentores ou simulações... (⌘K)"
            className="h-10 w-full rounded-xl border border-border bg-surface-alt pl-10 pr-4 text-sm text-text-primary ring-amber focus:border-amber focus:outline-none focus:ring-1 transition-all"
          />
        </div>
      </div>

      {/* ── Direita: Notificações + IA Status + Perfil ── */}
      <div className="flex items-center gap-3">
        {/* IA Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-raised border border-border">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-tighter">Tina Active</span>
        </div>

        {/* Notificações */}
        <button className="relative p-2 text-text-secondary hover:text-text-primary transition-colors">
          <Bell size={20} />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-amber border-2 border-background" />
        </button>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => { setDropdownOpen(!dropdownOpen); }}
            className="flex items-center gap-2 rounded-full border border-border bg-surface-raised p-1 pr-3 transition-all hover:bg-surface-alt"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber text-xs font-bold text-black uppercase">
              {user?.nome.charAt(0)}
            </div>
            <div className="hidden lg:block text-left">
              <p className="max-w-[80px] truncate text-xs font-bold text-text-primary">{user?.nome.split(' ')[0]}</p>
            </div>
            <ChevronDown size={14} className={`text-text-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute right-0 mt-2 w-48 origin-top-right rounded-2xl border border-border bg-surface p-2 shadow-xl"
            >
              <Link
                to="/app/perfil"
                onClick={() => { setDropdownOpen(false); }}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-text-secondary hover:bg-surface-raised hover:text-text-primary transition-colors"
              >
                <UserCircle size={18} /> O meu Perfil
              </Link>
              <Link
                to="/app/configuracoes"
                onClick={() => { setDropdownOpen(false); }}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-text-secondary hover:bg-surface-raised hover:text-text-primary transition-colors"
              >
                <Settings size={18} /> Configurações
              </Link>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => void handleLogout()}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors"
              >
                <LogOut size={18} /> Sair
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
}
