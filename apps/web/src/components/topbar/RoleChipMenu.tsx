import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  estudante: 'Estudante',
  aluno: 'Estudante',
  mentor: 'Mentor',
  instituicao: 'Instituição',
  moderador: 'Moderador',
  comite_cientifico: 'Comité',
  super_admin: 'Admin',
};

export function RoleChipMenu() {
  const { user, logout } = useAuth();
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  return (
    <div ref={ref} className="relative">
      <button
        data-testid="user-menu"
        onClick={() => { setOpen(o => !o); }}
        className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-elevated"
        style={{ borderColor: 'var(--glass-border-light)' }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <User size={14} />
        </div>
        <span className="hidden sm:block text-[11px] font-black uppercase tracking-widest text-ink-secondary">
          {roleLabel}
        </span>
        <ChevronDown size={12} className={`text-ink-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-48 rounded-2xl border bg-elevated shadow-2xl z-50"
          style={{ borderColor: 'var(--glass-border-light)' }}
        >
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs font-bold text-ink-primary truncate">{user.nome}</p>
            <p className="text-[10px] text-ink-tertiary truncate">{user.email}</p>
          </div>
          <div className="py-2">
            <button
              onClick={() => { setOpen(false); navigate('/app/perfil'); }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-ink-secondary hover:text-ink-primary hover:bg-recessed transition-colors"
            >
              <Settings size={14} /> Configurações
            </button>
            <button
              onClick={() => { setOpen(false); void logout(); }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-recessed transition-colors"
            >
              <LogOut size={14} /> Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
