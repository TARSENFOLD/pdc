import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Role } from '@/config/roles';

// ─── Sidebar item types ───────────────────────────────────────────────────────

interface NavLeaf {
  type: 'leaf';
  label: string;
  to: string;
  icon: string;
  roles: Role[];
}

interface NavGroup {
  type: 'group';
  label: string;
  icon: string;
  roles: Role[];
  children: NavLeaf[];
}

type SidebarItem = NavLeaf | NavGroup;

const ALL_ROLES: Role[] = [
  'aluno',
  'mentor',
  'instituicao',
  'moderador',
  'comite_cientifico',
  'super_admin',
];

const SIDEBAR_CONFIG: SidebarItem[] = [
  { type: 'leaf', label: 'Dashboard', to: '/app', icon: '◈', roles: ALL_ROLES },
  { type: 'leaf', label: 'Feed', to: '/app/feed', icon: '◉', roles: ALL_ROLES },

  // Aluno
  {
    type: 'group', label: 'Aprendizagem', icon: '📖', roles: ['aluno'],
    children: [
      { type: 'leaf', label: 'Simulações', to: '/app/simulacoes', icon: '⬡', roles: ['aluno'] },
      { type: 'leaf', label: 'Cursos', to: '/app/cursos', icon: '📚', roles: ['aluno'] },
      { type: 'leaf', label: 'Meus Cursos', to: '/app/meus-cursos', icon: '📕', roles: ['aluno'] },
      { type: 'leaf', label: 'Progresso', to: '/app/perfil-vocacional', icon: '📊', roles: ['aluno'] },
      { type: 'leaf', label: 'Certificados', to: '/app/certificados', icon: '🎓', roles: ['aluno'] },
      { type: 'leaf', label: 'Guardados', to: '/app/guardados', icon: '🔖', roles: ['aluno'] },
    ],
  },

  // Mentor
  {
    type: 'group', label: 'Conteúdo', icon: '📝', roles: ['mentor'],
    children: [
      { type: 'leaf', label: 'Cursos', to: '/app/mentor/cursos', icon: '📚', roles: ['mentor'] },
      { type: 'leaf', label: 'Simulações', to: '/app/mentor/simulacoes', icon: '⬡', roles: ['mentor'] },
      { type: 'leaf', label: 'Upload', to: '/app/mentor/upload', icon: '⬆️', roles: ['mentor'] },
    ],
  },
  {
    type: 'group', label: 'Alunos', icon: '🎓', roles: ['mentor'],
    children: [
      { type: 'leaf', label: 'Inscritos', to: '/app/mentor/alunos/inscritos', icon: '📋', roles: ['mentor'] },
      { type: 'leaf', label: 'Mentorados', to: '/app/mentor/mentorados', icon: '👥', roles: ['mentor'] },
    ],
  },
  { type: 'leaf', label: 'Analytics', to: '/app/mentor/analytics', icon: '📈', roles: ['mentor'] },

  // Instituição
  {
    type: 'group', label: 'Conteúdo', icon: '📝', roles: ['instituicao'],
    children: [
      { type: 'leaf', label: 'Experiências', to: '/app/instituicao/experiencias', icon: '🏛️', roles: ['instituicao'] },
      { type: 'leaf', label: 'Programas', to: '/app/instituicao/programas', icon: '📌', roles: ['instituicao'] },
    ],
  },
  {
    type: 'group', label: 'Pessoas', icon: '👥', roles: ['instituicao'],
    children: [
      { type: 'leaf', label: 'Estudantes Vinculados', to: '/app/instituicao/estudantes-vinculados', icon: '🔗', roles: ['instituicao'] },
      { type: 'leaf', label: 'Propostas', to: '/app/instituicao/propostas', icon: '📩', roles: ['instituicao'] },
    ],
  },
  { type: 'leaf', label: 'Relatórios', to: '/app/instituicao/relatorios', icon: '📊', roles: ['instituicao'] },

  // Moderação
  {
    type: 'group', label: 'Moderação', icon: '🛡️', roles: ['moderador', 'super_admin'],
    children: [
      { type: 'leaf', label: 'Aprovações', to: '/app/moderacao/aprovacoes', icon: '✅', roles: ['moderador', 'super_admin'] },
      { type: 'leaf', label: 'Denúncias', to: '/app/moderacao/denuncias', icon: '🚩', roles: ['moderador', 'super_admin'] },
    ],
  },
  {
    type: 'group', label: 'Gestão', icon: '⚙️', roles: ['moderador', 'super_admin'],
    children: [
      { type: 'leaf', label: 'Utilizadores', to: '/app/moderador/utilizadores', icon: '👤', roles: ['moderador', 'super_admin'] },
      { type: 'leaf', label: 'Reputação', to: '/app/moderador/reputacao', icon: '⭐', roles: ['moderador', 'super_admin'] },
    ],
  },

  // Comité Científico
  { type: 'leaf', label: 'Validação Científica', to: '/app/comite/validacao', icon: '🔬', roles: ['comite_cientifico'] },

  // Admin
  {
    type: 'group', label: 'Admin', icon: '⚙️', roles: ['super_admin'],
    children: [
      { type: 'leaf', label: 'Stats', to: '/app/admin/stats', icon: '📊', roles: ['super_admin'] },
      { type: 'leaf', label: 'Utilizadores', to: '/app/admin/utilizadores', icon: '👤', roles: ['super_admin'] },
      { type: 'leaf', label: 'Audit', to: '/app/admin/audit', icon: '📜', roles: ['super_admin'] },
      { type: 'leaf', label: 'LTI', to: '/app/admin/lti', icon: '🔌', roles: ['super_admin'] },
      { type: 'leaf', label: 'Feed Weights', to: '/app/admin/feed-weights', icon: '⚖️', roles: ['super_admin'] },
    ],
  },

  // Transversal
  { type: 'leaf', label: 'Mentorias', to: '/app/mentorias', icon: '👨‍🏫', roles: ['aluno', 'mentor', 'super_admin'] },
  { type: 'leaf', label: 'Conquistas', to: '/app/conquistas', icon: '🏆', roles: ['aluno', 'super_admin'] },
  { type: 'leaf', label: 'Vínculos', to: '/app/vinculos', icon: '🔗', roles: ALL_ROLES },
  { type: 'leaf', label: 'Mensagens', to: '/app/mensagens', icon: '✉️', roles: ALL_ROLES },
  { type: 'leaf', label: 'Perfil', to: '/app/perfil', icon: '👤', roles: ALL_ROLES },
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

function getStorageKey(role: Role): string {
  return `sidebar:groups:${role}`;
}

function loadGroupState(role: Role): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(getStorageKey(role));
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    // ignore
  }
  return {};
}

function saveGroupState(role: Role, state: Record<string, boolean>): void {
  try {
    localStorage.setItem(getStorageKey(role), JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (role) {
      setOpenGroups(loadGroupState(role));
    }
  }, [role]);

  const visibleItems = role
    ? SIDEBAR_CONFIG.filter((item) => item.roles.includes(role))
    : [];

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      if (role) saveGroupState(role, next);
      return next;
    });
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  function renderLeaf(item: NavLeaf) {
    return (
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
    );
  }

  function renderGroup(item: NavGroup) {
    const groupKey = `${item.label}:${item.roles.join(',')}`;
    const isOpen = openGroups[groupKey] ?? false;
    const visibleChildren = role
      ? item.children.filter((child) => child.roles.includes(role))
      : [];

    return (
      <li key={groupKey}>
        <button
          onClick={() => { toggleGroup(groupKey); }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          <span className="text-base leading-none">{item.icon}</span>
          <span className="flex-1 text-left">{item.label}</span>
          <span className={`text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>▸</span>
        </button>
        {isOpen && (
          <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-white/5 pl-2">
            {visibleChildren.map(renderLeaf)}
          </ul>
        )}
      </li>
    );
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
          {visibleItems.map((item) =>
            item.type === 'group' ? renderGroup(item) : renderLeaf(item)
          )}
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
