import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Role } from '@/config/roles';

// ─── Nav item definition ──────────────────────────────────────────────────────

interface NavItem {
  label: string;
  to: string;
  icon: string;
  roles: Role[];
}

const ALL_ROLES: Role[] = [
  'aluno',
  'mentor',
  'instituicao',
  'moderador',
  'comite_cientifico',
  'super_admin',
];

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    to: '/app/dashboard',    icon: '◈', roles: ALL_ROLES },
  { label: 'Simulações',   to: '/app/simulations',  icon: '⬡', roles: ['aluno', 'comite_cientifico', 'super_admin'] },
  { label: 'Cursos',       to: '/app/courses',      icon: '📚', roles: ['aluno', 'mentor', 'instituicao', 'comite_cientifico', 'super_admin'] },
  { label: 'Experiências', to: '/app/experiences',  icon: '🏛️', roles: ['aluno', 'instituicao', 'comite_cientifico', 'super_admin'] },
  { label: 'Mentorias',    to: '/app/mentors',      icon: '👨‍🏫', roles: ['aluno', 'mentor', 'super_admin'] },
  { label: 'Programas',    to: '/app/programs',     icon: '📋', roles: ['aluno', 'instituicao', 'comite_cientifico', 'super_admin'] },
  { label: 'Projetos',     to: '/app/projects',     icon: '🗂️', roles: ['aluno', 'mentor', 'comite_cientifico', 'super_admin'] },
  { label: 'Feed',         to: '/app/feed',         icon: '◉', roles: ALL_ROLES },
  { label: 'Moderação',    to: '/app/moderation',   icon: '🛡️', roles: ['moderador', 'comite_cientifico', 'super_admin'] },
  { label: 'Admin',        to: '/app/admin',        icon: '⚙️', roles: ['super_admin'] },
  { label: 'Perfil',       to: '/app/profile',      icon: '👤', roles: ALL_ROLES },
];

// ─── Role label ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<Role, string> = {
  aluno: 'Aluno',
  mentor: 'Mentor',
  instituicao: 'Instituição',
  moderador: 'Moderador',
  comite_cientifico: 'Comité Científico',
  super_admin: 'Super Admin',
};

// ─── Sidebar content ──────────────────────────────────────────────────────────

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;

  const visibleItems = role
    ? NAV_ITEMS.filter((item) => item.roles.includes(role))
    : [];

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/5">
        <span className="text-lg font-bold text-amber">PDC</span>
        <span className="text-xs text-white/30">Por Dentro do Curso</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-0.5 px-2">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-amber/10 text-amber font-medium'
                      : 'text-white/60 hover:bg-white/5 hover:text-white',
                  ].join(' ')
                }
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-white/5 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/3 px-3 py-2.5">
            {/* Avatar initials */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber/20 text-xs font-bold text-amber">
              {user.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.nome}</p>
              <p className="truncate text-xs text-white/40">
                {role ? ROLE_LABELS[role] : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white"
          >
            <span>↩</span>
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
