import { useState, type ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import type { Role } from '@pdc/shared';
import {
  LayoutDashboard, Rss, BookOpen, FlaskConical, Trophy,
  GraduationCap, Award, Link2, 
  Shield, CheckCircle,
  Settings, BookOpenText, PenSquare,
  MapPin, Star, Microscope, ScrollText, ChevronRight,
  Brain, Zap, Building2,
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
  domain?: string;
}

interface NavGroup {
  type: 'group';
  label: string;
  icon: LucideIcon;
  roles: Role[];
  children: NavLeaf[];
  domain?: string;
}

type SidebarItem = NavLeaf | NavGroup;

const ALL_ROLES: Role[] = [
  'estudante', 'mentor', 'instituicao', 'moderador', 'comite_cientifico', 'super_admin',
];

/**
 * SIDEBAR_CONFIG (Wave 4 - Elite Hubs)
 * Sincronizado com as Feature Flags (Ticket T6 Fix)
 */
const SIDEBAR_CONFIG: SidebarItem[] = [
  { type: 'leaf', label: 'Início', to: '/app/home', icon: LayoutDashboard, roles: ALL_ROLES },
  
  // HUB: APRENDER (Músculo Técnico)
  {
    type: 'group', label: 'Aprender', icon: BookOpenText, roles: ['estudante', 'aluno'],
    domain: 'HUB_LEARN',
    children: [
      { type: 'leaf', label: 'Simulações', to: '/app/simulacoes', icon: FlaskConical, roles: ['estudante', 'aluno'] },
      { type: 'leaf', label: 'Cursos', to: '/app/cursos', icon: BookOpen, roles: ['estudante', 'aluno'] },
      { type: 'leaf', label: 'Meus Cursos', to: '/app/meus-cursos', icon: CheckCircle, roles: ['estudante', 'aluno'] },
    ],
  },

  // HUB: EXPLORAR (Músculo Institucional)
  {
    type: 'group', label: 'Explorar', icon: Building2, roles: ['estudante', 'aluno'],
    domain: 'HUB_EXPLORE',
    children: [
      { type: 'leaf', label: 'Experiências', to: '/app/experiencias', icon: MapPin, roles: ['estudante', 'aluno'] },
      { type: 'leaf', label: 'Programas', to: '/app/programas', icon: GraduationCap, roles: ['estudante', 'aluno'] },
      { type: 'leaf', label: 'Catálogo', to: '/app/explorar', icon: ScrollText, roles: ['estudante', 'aluno'] },
    ],
  },

  // HUB: MEU FUTURO (A Joia da Coroa)
  {
    type: 'group', label: 'Meu Futuro', icon: Star, roles: ['estudante', 'aluno'],
    domain: 'HUB_FUTURE',
    children: [
      { type: 'leaf', label: 'Relatório Vocacional', to: '/app/perfil-vocacional', icon: Brain, roles: ['estudante', 'aluno'] },
      { type: 'leaf', label: 'Reputação', to: '/app/reputacao', icon: Star, roles: ['estudante', 'aluno'] },
      { type: 'leaf', label: 'Certificados', to: '/app/certificados', icon: Award, roles: ['estudante', 'aluno'] },
    ],
  },

  // HUB: COMUNIDADE (O Pulso Social)
  {
    type: 'group', label: 'Comunidade', icon: Rss, roles: ALL_ROLES,
    domain: 'HUB_COMMUNITY',
    children: [
      { type: 'leaf', label: 'Feed de Mérito', to: '/app/feed', icon: Zap, roles: ALL_ROLES },
      { type: 'leaf', label: 'Ranking', to: '/app/ranking', icon: Trophy, roles: ALL_ROLES },
      { type: 'leaf', label: 'Rede e Vínculos', to: '/app/vinculos', icon: Link2, roles: ALL_ROLES },
    ],
  },

  // MENTOR HUB
  {
    type: 'group', label: 'Estúdio Mentor', icon: PenSquare, roles: ['mentor'],
    domain: 'HUB_MENTOR',
    children: [
      { type: 'leaf', label: 'Gestão de Cursos', to: '/app/mentor/cursos', icon: BookOpen, roles: ['mentor'] },
      { type: 'leaf', label: 'Laboratórios', to: '/app/mentor/simulacoes', icon: FlaskConical, roles: ['mentor'] },
    ],
  },

  // INSTITUIÇÃO HUB
  {
    type: 'group', label: 'Gestão Institucional', icon: Building2, roles: ['instituicao'],
    domain: 'HUB_INSTITUTION',
    children: [
      { type: 'leaf', label: 'Vitrinas Curriculares', to: '/app/instituicao/experiencias', icon: MapPin, roles: ['instituicao'] },
      { type: 'leaf', label: 'Roteiros (Programas)', to: '/app/instituicao/programas', icon: GraduationCap, roles: ['instituicao'] },
    ],
  },

  // ADMIN / MODERAÇÃO (Rigor)
  {
    type: 'group', label: 'Autoridade', icon: Shield, roles: ['moderador', 'super_admin', 'comite_cientifico'],
    children: [
      { type: 'leaf', label: 'Auditoria Científica', to: '/app/comite/validacao', icon: Microscope, roles: ['comite_cientifico', 'super_admin'] },
      { type: 'leaf', label: 'Fila de Aprovações', to: '/app/moderacao/aprovacoes', icon: CheckCircle, roles: ['moderador', 'super_admin'] },
      { type: 'leaf', label: 'Painel Admin', to: '/app/admin/stats', icon: Settings, roles: ['super_admin'] },
    ],
  },
];

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { user } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const role = user?.role;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    return role ? loadGroupState(role) : {};
  });

  const visibleItems = role
    ? SIDEBAR_CONFIG.filter((item) => {
        const hasRole = item.roles.includes(role);
        if (!hasRole) return false;
        if (item.domain && !isEnabled(item.domain)) return false;
        return true;
      })
    : [];

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      if (role) saveGroupState(role, next);
      return next;
    });
  }

  function renderLeaf(item: NavLeaf) {
    return (
      <li key={item.to}>
        <NavLink
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all duration-300',
              isActive
                ? 'bg-accent text-white font-bold shadow-lg shadow-accent/20 scale-[1.02]'
                : 'text-ink-secondary hover:bg-elevated hover:text-ink-primary',
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
      ? item.children.filter((child) => {
          const hasRole = child.roles.includes(role as Role);
          if (!hasRole) return false;
          if (child.domain && !isEnabled(child.domain)) return false;
          return true;
        })
      : [];

    if (visibleChildren.length === 0) return null;

    return (
      <li key={groupKey} className="space-y-1">
        <button
          onClick={() => { toggleGroup(groupKey); }}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-ink-tertiary transition-all hover:text-ink-primary"
        >
          <item.icon size={16} aria-hidden={true} className="shrink-0 text-accent/40" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronRight size={14} aria-hidden={true} className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
        </button>
        {isOpen && (
          <ul className="ml-4 space-y-1 border-l border-white/5 pl-2 animate-in slide-in-from-left-1 duration-300">
            {visibleChildren.map(renderLeaf)}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div className="flex h-full flex-col bg-canvas border-r border-white/5">
      <div className="flex items-center gap-4 px-6 py-6 border-b border-white/5 bg-white/1">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent shadow-xl shadow-accent/20">
          <span className="font-display font-black text-white text-lg">P</span>
        </div>
        <div>
          <span className="block text-base font-black text-ink-primary tracking-tighter">PDC</span>
          <span className="block text-[7px] text-accent font-black uppercase tracking-[0.3em]">Por Dentro do Curso</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-8 scrollbar-none">
        <ul className="space-y-4 px-4">
          {visibleItems.map((item) =>
            item.type === 'group' ? renderGroup(item) : renderLeaf(item)
          )}
        </ul>
      </nav>

    </div>
  );
}

function getStorageKey(role: Role): string {
  return `sidebar:groups:${role}`;
}

function loadGroupState(role: Role): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(getStorageKey(role));
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch { /* ignore */ }
  // Por defeito, os hubs principais de estudante estão abertos
  return { 'Aprender:estudante': true, 'Meu Futuro:estudante': true };
}

function saveGroupState(role: Role, state: Record<string, boolean>): void {
  try {
    localStorage.setItem(getStorageKey(role), JSON.stringify(state));
  } catch { /* ignore */ }
}

interface SidebarContentProps {
  onNavigate?: () => void;
}
