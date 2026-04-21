import { useState, type ComponentType } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { Avatar } from '../ui/Avatar';
import type { Role } from '@/config/roles';
import {
  LayoutDashboard, Rss, BookOpen, FlaskConical, Trophy,
  GraduationCap, Award, Link2, MessageSquare,
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
  { type: 'leaf', label: 'Início', to: '/app', icon: LayoutDashboard, roles: ALL_ROLES },
  
  // HUB: APRENDER (Músculo Técnico)
  {
    type: 'group', label: 'Aprender', icon: BookOpenText, roles: ['estudante'],
    domain: 'HUB_LEARN',
    children: [
      { type: 'leaf', label: 'Simulações', to: '/app/simulacoes', icon: FlaskConical, roles: ['estudante'] },
      { type: 'leaf', label: 'Cursos', to: '/app/cursos', icon: BookOpen, roles: ['estudante'] },
      { type: 'leaf', label: 'Meus Cursos', to: '/app/meus-cursos', icon: CheckCircle, roles: ['estudante'] },
    ],
  },

  // HUB: EXPLORAR (Músculo Institucional)
  {
    type: 'group', label: 'Explorar', icon: Building2, roles: ['estudante'],
    domain: 'HUB_EXPLORE',
    children: [
      { type: 'leaf', label: 'Experiências', to: '/app/instituicao/experiencias', icon: MapPin, roles: ['estudante'] },
      { type: 'leaf', label: 'Programas', to: '/app/instituicao/programas', icon: GraduationCap, roles: ['estudante'] },
      { type: 'leaf', label: 'Catálogo', to: '/app/explorar', icon: ScrollText, roles: ['estudante'] },
    ],
  },

  // HUB: MEU FUTURO (A Joia da Coroa)
  {
    type: 'group', label: 'Meu Futuro', icon: Star, roles: ['estudante'],
    domain: 'HUB_FUTURE',
    children: [
      { type: 'leaf', label: 'Relatório Vocacional', to: '/app/perfil-vocacional', icon: Brain, roles: ['estudante'] },
      { type: 'leaf', label: 'Reputação', to: '/app/reputacao', icon: Star, roles: ['estudante'] },
      { type: 'leaf', label: 'Certificados', to: '/app/certificados', icon: Award, roles: ['estudante'] },
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
      { type: 'leaf', label: 'Mensagens', to: '/app/mensagens', icon: MessageSquare, roles: ALL_ROLES },
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
  const navigate = useNavigate();
  const role = user?.role;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
     if (role) return loadGroupState(role);
     return {};
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
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-text-muted transition-all hover:text-text-primary"
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
    <div className="flex h-full flex-col bg-surface border-r border-white/5">
      <div className="flex items-center gap-4 px-8 py-10 border-b border-white/5 bg-white/1">
        <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-accent shadow-xl shadow-accent/20">
          <span className="font-display font-black text-white text-xl">P</span>
        </div>
        <div>
          <span className="block text-lg font-black text-text-primary tracking-tighter">PDC v2</span>
          <span className="block text-[8px] text-accent font-black uppercase tracking-[0.4em]">Sovereign Engine</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-8 scrollbar-none">
        <ul className="space-y-4 px-4">
          {visibleItems.map((item) =>
            item.type === 'group' ? renderGroup(item) : renderLeaf(item)
          )}
        </ul>
      </nav>

      <div className="p-6 border-t border-white/5 bg-white/1 space-y-4">
        {/* User Quick Profile (R2.T6 Integrity) */}
        <Link 
          to="/app/perfil"
          onClick={onNavigate}
          className="flex items-center gap-3 p-3 rounded-2xl bg-surface-alt border border-white/5 hover:bg-surface-raised transition-all group"
        >
          <Avatar 
            size="sm" 
            src={user?.avatarUrl || undefined} 
            alt={user?.nome} 
            tier={user?.reputacaoTier}
            className="border-none"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-text-primary truncate">{user?.nome}</p>
            <p className="text-[9px] font-bold text-accent uppercase tracking-widest">{user?.reputacaoTier || 'Bronze'}</p>
          </div>
          <ChevronRight size={14} className="text-text-muted group-hover:text-accent transition-colors" />
        </Link>

        <div className="rounded-3xl bg-surface-raised p-5 border border-accent/10 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <Brain size={80} />
          </div>
          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Assistência Soberana</p>
          <p className="text-[10px] text-text-secondary leading-relaxed mb-4">A Tina está pronta para analisar a tua jornada.</p>
          <button 
             onClick={() => { navigate('/app/explorar'); onNavigate?.(); }}
             className="w-full py-2.5 bg-accent/10 border border-accent/20 rounded-xl text-[9px] font-black text-accent uppercase tracking-widest hover:bg-accent hover:text-white transition-all"
          >
            Falar com o Oráculo
          </button>
        </div>
      </div>
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
