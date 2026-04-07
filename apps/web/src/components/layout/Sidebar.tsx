import { useState, useEffect, type ComponentType } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Role } from '@/config/roles';
import {
  LayoutDashboard, Rss, BookOpen, FlaskConical, BarChart3, Trophy,
  GraduationCap, Bookmark, Users, Award, Link2, MessageSquare,
  UserCircle, TrendingUp, Upload, Shield, CheckCircle, Flag,
  Settings, LogOut, BookOpenText, PenSquare, ClipboardList, Building2,
  MapPin, Mail, Star, Microscope, ScrollText, Plug, Scale, ChevronRight,
  type LucideProps,
} from 'lucide-react';

// ─── Sidebar item types ───────────────────────────────────────────────────────

type LucideIcon = ComponentType<LucideProps>;

interface NavLeaf {
  type: 'leaf';
  label: string;
  to: string;
  icon: LucideIcon;
  roles: Role[];
}

interface NavGroup {
  type: 'group';
  label: string;
  icon: LucideIcon;
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
  { type: 'leaf', label: 'Dashboard', to: '/app', icon: LayoutDashboard, roles: ALL_ROLES },
  { type: 'leaf', label: 'Feed', to: '/app/feed', icon: Rss, roles: ALL_ROLES },

  // Aluno
  {
    type: 'group', label: 'Aprendizagem', icon: BookOpen, roles: ['aluno'],
    children: [
      { type: 'leaf', label: 'Simulações', to: '/app/simulacoes', icon: FlaskConical, roles: ['aluno'] },
      { type: 'leaf', label: 'Cursos', to: '/app/cursos', icon: BookOpenText, roles: ['aluno'] },
      { type: 'leaf', label: 'Meus Cursos', to: '/app/meus-cursos', icon: BookOpen, roles: ['aluno'] },
      { type: 'leaf', label: 'Relatório Vocacional', to: '/app/perfil-vocacional', icon: BarChart3, roles: ['aluno'] },
      { type: 'leaf', label: 'Ranking', to: '/app/ranking', icon: Trophy, roles: ['aluno'] },
      { type: 'leaf', label: 'Certificados', to: '/app/certificados', icon: GraduationCap, roles: ['aluno'] },
      { type: 'leaf', label: 'Guardados', to: '/app/guardados', icon: Bookmark, roles: ['aluno'] },
    ],
  },

  // Mentor
  {
    type: 'group', label: 'Conteúdo', icon: PenSquare, roles: ['mentor'],
    children: [
      { type: 'leaf', label: 'Cursos', to: '/app/mentor/cursos', icon: BookOpen, roles: ['mentor'] },
      { type: 'leaf', label: 'Simulações', to: '/app/mentor/simulacoes', icon: FlaskConical, roles: ['mentor'] },
      { type: 'leaf', label: 'Upload', to: '/app/mentor/upload', icon: Upload, roles: ['mentor'] },
    ],
  },
  {
    type: 'group', label: 'Alunos', icon: GraduationCap, roles: ['mentor'],
    children: [
      { type: 'leaf', label: 'Inscritos', to: '/app/mentor/alunos/inscritos', icon: ClipboardList, roles: ['mentor'] },
      { type: 'leaf', label: 'Mentorados', to: '/app/mentor/mentorados', icon: Users, roles: ['mentor'] },
    ],
  },
  { type: 'leaf', label: 'Analytics', to: '/app/mentor/analytics', icon: TrendingUp, roles: ['mentor'] },

  // Instituição
  {
    type: 'group', label: 'Conteúdo', icon: PenSquare, roles: ['instituicao'],
    children: [
      { type: 'leaf', label: 'Experiências', to: '/app/instituicao/experiencias', icon: Building2, roles: ['instituicao'] },
      { type: 'leaf', label: 'Programas', to: '/app/instituicao/programas', icon: MapPin, roles: ['instituicao'] },
    ],
  },
  {
    type: 'group', label: 'Pessoas', icon: Users, roles: ['instituicao'],
    children: [
      { type: 'leaf', label: 'Estudantes Vinculados', to: '/app/instituicao/estudantes-vinculados', icon: Link2, roles: ['instituicao'] },
      { type: 'leaf', label: 'Propostas', to: '/app/instituicao/propostas', icon: Mail, roles: ['instituicao'] },
    ],
  },
  { type: 'leaf', label: 'Relatórios', to: '/app/instituicao/relatorios', icon: BarChart3, roles: ['instituicao'] },

  // Moderação
  {
    type: 'group', label: 'Moderação', icon: Shield, roles: ['moderador', 'super_admin'],
    children: [
      { type: 'leaf', label: 'Aprovações', to: '/app/moderacao/aprovacoes', icon: CheckCircle, roles: ['moderador', 'super_admin'] },
      { type: 'leaf', label: 'Denúncias', to: '/app/moderacao/denuncias', icon: Flag, roles: ['moderador', 'super_admin'] },
    ],
  },
  {
    type: 'group', label: 'Gestão', icon: Settings, roles: ['moderador', 'super_admin'],
    children: [
      { type: 'leaf', label: 'Utilizadores', to: '/app/moderador/utilizadores', icon: UserCircle, roles: ['moderador', 'super_admin'] },
      { type: 'leaf', label: 'Reputação', to: '/app/moderador/reputacao', icon: Star, roles: ['moderador', 'super_admin'] },
    ],
  },

  // Comité Científico
  { type: 'leaf', label: 'Validação Científica', to: '/app/comite/validacao', icon: Microscope, roles: ['comite_cientifico'] },

  // Admin
  {
    type: 'group', label: 'Admin', icon: Settings, roles: ['super_admin'],
    children: [
      { type: 'leaf', label: 'Stats', to: '/app/admin/stats', icon: BarChart3, roles: ['super_admin'] },
      { type: 'leaf', label: 'Utilizadores', to: '/app/admin/utilizadores', icon: UserCircle, roles: ['super_admin'] },
      { type: 'leaf', label: 'Audit', to: '/app/admin/audit', icon: ScrollText, roles: ['super_admin'] },
      { type: 'leaf', label: 'LTI', to: '/app/admin/lti', icon: Plug, roles: ['super_admin'] },
      { type: 'leaf', label: 'Feed Weights', to: '/app/admin/feed-weights', icon: Scale, roles: ['super_admin'] },
    ],
  },

  // Transversal
  { type: 'leaf', label: 'Mentorias', to: '/app/mentorias', icon: Users, roles: ['aluno', 'mentor', 'super_admin'] },
  { type: 'leaf', label: 'Conquistas', to: '/app/conquistas', icon: Award, roles: ['aluno', 'super_admin'] },
  { type: 'leaf', label: 'Vínculos', to: '/app/vinculos', icon: Link2, roles: ALL_ROLES },
  { type: 'leaf', label: 'Mensagens', to: '/app/mensagens', icon: MessageSquare, roles: ALL_ROLES },
  { type: 'leaf', label: 'Perfil', to: '/app/perfil', icon: UserCircle, roles: ALL_ROLES },
  { type: 'leaf', label: 'Configurações', to: '/app/configuracoes', icon: Settings, roles: ALL_ROLES },
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
                : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary',
            ].join(' ')
          }
        >
          <item.icon size={18} aria-hidden={true} className="shrink-0" />
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
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <item.icon size={18} aria-hidden={true} className="shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronRight size={14} aria-hidden={true} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </button>
        {isOpen && (
          <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
            {visibleChildren.map(renderLeaf)}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-border">
        <span className="text-lg font-bold text-amber">PDC</span>
        <span className="text-xs text-text-muted">Por Dentro do Curso</span>
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
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-surface-raised px-3 py-2.5">
            {/* Avatar initials */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber/20 text-xs font-bold text-amber">
              {user.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{user.nome}</p>
              <p className="truncate text-xs text-text-muted">
                {role ? ROLE_LABELS[role] : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
          >
            <LogOut size={18} aria-hidden={true} className="shrink-0" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
