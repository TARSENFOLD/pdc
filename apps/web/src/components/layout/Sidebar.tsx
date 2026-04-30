import { useState, type ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import type { Role } from '@pdc/shared';
import { NavItems, type NavItemSlug } from '@pdc/shared';
import {
  LayoutDashboard, Rss, BookOpen, FlaskConical, Trophy,
  GraduationCap, Award, Link2, 
  Shield, CheckCircle,
  Settings, BookOpenText, PenSquare,
  MapPin, Star, Microscope, ScrollText, ChevronRight,
  Brain, Zap, Building2, BarChart3,
  type LucideProps,
} from 'lucide-react';

// ─── Sidebar item types ───────────────────────────────────────────────────────

type LucideIcon = ComponentType<LucideProps>;

interface NavLeaf {
  type: 'leaf';
  slug: NavItemSlug;
  to: string;
  icon: LucideIcon;
  roles: Role[];
  domain?: string;
}

interface NavGroup {
  type: 'group';
  slug: NavItemSlug;
  icon: LucideIcon;
  roles: Role[];
  children: NavLeaf[];
  domain?: string;
}

type SidebarItem = NavLeaf | NavGroup;

const ALL_ROLES: Role[] = [
  'estudante', 'mentor', 'instituicao', 'moderador', 'comite_cientifico', 'super_admin', 'patrocinador',
];

const DASHBOARD_BY_ROLE: Record<Role, string> = {
  estudante: '/app/dashboard/estudante',
  mentor: '/app/dashboard/mentor',
  instituicao: '/app/dashboard/instituicao',
  moderador: '/app/dashboard/moderador',
  comite_cientifico: '/app/dashboard/comite',
  super_admin: '/app/dashboard/admin',
  patrocinador: '/app/dashboard/patrocinador',
};

/**
 * SIDEBAR_CONFIG (Wave 4 - Elite Hubs)
 * Sincronizado com as Feature Flags e Glossary.ts
 */
const SIDEBAR_CONFIG: SidebarItem[] = [
  { type: 'leaf', slug: 'inicio', to: '/app/home', icon: LayoutDashboard, roles: ALL_ROLES },
  // 'Meu Dashboard' — to é placeholder, resolvido dinamicamente no render
  { type: 'leaf', slug: 'meu_dashboard', to: '/app/dashboard', icon: BarChart3, roles: ALL_ROLES },
  
  // HUB: APRENDER (Músculo Técnico)
  {
    type: 'group', slug: 'aprender', icon: BookOpenText, roles: ['estudante'],
    domain: 'HUB_LEARN',
    children: [
      { type: 'leaf', slug: 'simulacoes', to: '/app/simulacoes', icon: FlaskConical, roles: ['estudante'] },
      { type: 'leaf', slug: 'cursos', to: '/app/cursos', icon: BookOpen, roles: ['estudante'] },
      { type: 'leaf', slug: 'meus_cursos', to: '/app/meus-cursos', icon: CheckCircle, roles: ['estudante'] },
    ],
  },

  // HUB: EXPLORAR (Músculo Institucional)
  {
    type: 'group', slug: 'explorar', icon: Building2, roles: ['estudante'],
    domain: 'HUB_EXPLORE',
    children: [
      { type: 'leaf', slug: 'experiencias', to: '/app/experiencias', icon: MapPin, roles: ['estudante'] },
      { type: 'leaf', slug: 'programas', to: '/app/programas', icon: GraduationCap, roles: ['estudante'] },
      { type: 'leaf', slug: 'catalogo', to: '/app/explorar', icon: ScrollText, roles: ['estudante'] },
    ],
  },

  // HUB: MEU FUTURO (A Joia da Coroa)
  {
    type: 'group', slug: 'meu_futuro', icon: Star, roles: ['estudante'],
    domain: 'HUB_FUTURE',
    children: [
      { type: 'leaf', slug: 'relatorio_vocacional', to: '/app/perfil-vocacional', icon: Brain, roles: ['estudante'] },
      { type: 'leaf', slug: 'reputacao', to: '/app/reputacao', icon: Star, roles: ['estudante'] },
      { type: 'leaf', slug: 'certificados', to: '/app/certificados', icon: Award, roles: ['estudante'] },
    ],
  },

  // HUB: COMUNIDADE (O Pulso Social)
  {
    type: 'group', slug: 'comunidade', icon: Rss, roles: ALL_ROLES,
    domain: 'HUB_COMMUNITY',
    children: [
      { type: 'leaf', slug: 'feed', to: '/app/feed', icon: Zap, roles: ALL_ROLES },
      { type: 'leaf', slug: 'ranking', to: '/app/ranking', icon: Trophy, roles: ALL_ROLES },
      { type: 'leaf', slug: 'vinculos', to: '/app/vinculos', icon: Link2, roles: ALL_ROLES },
    ],
  },

  // MENTOR HUB
  {
    type: 'group', slug: 'estudio_mentor', icon: PenSquare, roles: ['mentor'],
    domain: 'HUB_MENTOR',
    children: [
      { type: 'leaf', slug: 'gestao_cursos', to: '/app/mentor/cursos', icon: BookOpen, roles: ['mentor'] },
      { type: 'leaf', slug: 'laboratorios', to: '/app/mentor/simulacoes', icon: FlaskConical, roles: ['mentor'] },
    ],
  },

  // INSTITUIÇÃO HUB
  {
    type: 'group', slug: 'gestao_institucional', icon: Building2, roles: ['instituicao'],
    domain: 'HUB_INSTITUTION',
    children: [
      { type: 'leaf', slug: 'vitrinas_curriculares', to: '/app/instituicao/experiencias', icon: MapPin, roles: ['instituicao'] },
      { type: 'leaf', slug: 'roteiros', to: '/app/instituicao/programas', icon: GraduationCap, roles: ['instituicao'] },
    ],
  },

  // ADMIN / MODERAÇÃO (Rigor)
  {
    type: 'group', slug: 'autoridade', icon: Shield, roles: ['moderador', 'super_admin', 'comite_cientifico'],
    children: [
      { type: 'leaf', slug: 'auditoria_cientifica', to: '/app/comite/validacao', icon: Microscope, roles: ['comite_cientifico', 'super_admin'] },
      { type: 'leaf', slug: 'fila_aprovacoes', to: '/app/moderacao/aprovacoes', icon: CheckCircle, roles: ['moderador', 'super_admin'] },
      { type: 'leaf', slug: 'painel_admin', to: '/app/admin/stats', icon: Settings, roles: ['super_admin'] },
    ],
  },
];

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { user } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const { i18n } = useTranslation();
  const role = user?.role;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    return role ? loadGroupState(role) : {};
  });

  const getLabel = (slug: NavItemSlug) => {
    const entry = NavItems[slug];
    const lang = i18n.language as keyof typeof entry;
    return entry[lang] || entry['pt-PT'];
  };

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
    const label = getLabel(item.slug);
    const resolvedTo = item.slug === 'meu_dashboard' && role
      ? DASHBOARD_BY_ROLE[role]
      : item.to;
    return (
      <li key={resolvedTo}>
        <NavLink
          to={resolvedTo}
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all duration-300 min-h-[44px]',
              isActive
                ? 'bg-accent text-white font-semibold shadow-lg shadow-accent/20 scale-[1.02]'
                : 'text-ink-secondary hover:bg-elevated hover:text-ink-primary',
            ].join(' ')
          }
        >
          <item.icon size={18} aria-hidden={true} className="shrink-0" />
          {label}
        </NavLink>
      </li>
    );
  }

  function renderGroup(item: NavGroup) {
    const label = getLabel(item.slug);
    const groupKey = `${item.slug}:${item.roles.join(',')}`;
    const isOpen = openGroups[groupKey] ?? false;
    const visibleChildren = role
      ? item.children.filter((child) => {
          const hasRole = child.roles.includes(role);
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
          className="flex w-full min-h-[44px] items-center gap-3 rounded-2xl px-4 py-3 text-xs font-semibold text-ink-tertiary transition-all hover:text-ink-primary"
        >
          <item.icon size={16} aria-hidden={true} className="shrink-0 text-accent/40" />
          <span className="flex-1 text-left">{label}</span>
          <ChevronRight size={14} aria-hidden={true} className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
        </button>
        {isOpen && (
          <ul className="ml-4 space-y-1 border-l border-ink-tertiary/10 pl-2 animate-in slide-in-from-left-1 duration-300">
            {visibleChildren.map(renderLeaf)}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--surface-elevated)] border-r border-[var(--glass-border-light)]">
      <div className="flex items-center gap-4 px-6 py-6 border-b border-[var(--glass-border-light)]">
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-asym-a)] bg-[var(--accent-terracotta)] text-[var(--ink-on-accent)] shadow-xl shadow-[var(--accent-terracotta-glow)]">
          <span className="font-authority font-bold text-xl">P</span>
        </div>
        <div>
          <span className="block text-lg font-semibold text-[var(--ink-primary)] tracking-tight">PDC</span>
          <span className="block text-xs font-medium text-[var(--ink-tertiary)]">Por Dentro do Curso</span>
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
  return { 'aprender:estudante': true, 'meu_futuro:estudante': true };
}

function saveGroupState(role: Role, state: Record<string, boolean>): void {
  try {
    localStorage.setItem(getStorageKey(role), JSON.stringify(state));
  } catch { /* ignore */ }
}

interface SidebarContentProps {
  onNavigate?: () => void;
}
