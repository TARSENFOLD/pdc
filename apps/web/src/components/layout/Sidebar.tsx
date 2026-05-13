import { useState } from 'react';
import type React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth/auth-context';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import type { Role } from '@pdc/shared';
import { NavItems, type NavItemSlug } from '@pdc/shared';
import { ChevronRight, Settings, LogOut } from 'lucide-react';
import { ALL_ROLES, DASHBOARD_BY_ROLE, SIDEBAR_CONFIG, type NavGroup, type NavLeaf } from './Sidebar.config';

export default function SidebarContent({ onNavigate, collapsed = false }: SidebarContentProps): React.JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isEnabled } = useFeatureFlags();
  const { i18n } = useTranslation();
  const role = user?.role;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    return role ? loadGroupState(role) : {};
  });

  const getLabel = (slug: NavItemSlug) => {
    const entry = NavItems[slug];
    if (!entry) return String(slug);
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
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            [
              'flex items-center rounded-lg transition-all duration-150 min-h-[44px]',
              collapsed ? 'justify-center px-0 py-3 mx-1' : 'gap-3 px-3 py-2 text-sm mx-1',
              isActive
                ? 'bg-[var(--accent-terracotta)] text-white font-semibold'
                : 'text-[var(--ink-secondary)] hover:bg-[var(--chrome-surface-strong)] hover:text-[var(--ink-primary)]',
            ].join(' ')
          }
        >
          <item.icon size={18} aria-hidden={true} className="shrink-0" />
          {!collapsed && label}
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

    if (collapsed) {
      return (
        <li key={groupKey} className="space-y-1">
          <ul>{visibleChildren.map(renderLeaf)}</ul>
        </li>
      );
    }

    return (
      <li key={groupKey} className="space-y-1">
        <button
          onClick={() => { toggleGroup(groupKey); }}
          className="flex w-full min-h-[44px] items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] transition-all hover:bg-[var(--chrome-surface-strong)] hover:text-[var(--ink-primary)]"
        >
          <item.icon size={16} aria-hidden={true} className="shrink-0 text-[var(--ink-secondary)]" />
          <span className="flex-1 text-left">{label}</span>
          <ChevronRight size={14} aria-hidden={true} className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
        </button>
        {isOpen && (
          <ul className="ml-4 space-y-1 border-l border-[var(--chrome-border)] pl-2 animate-in slide-in-from-left-1 duration-300">
            {visibleChildren.map(renderLeaf)}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--chrome-surface)]">
      {/* Header: logo */}
      <div className={`flex items-center py-5 ${collapsed ? 'justify-center px-0' : 'gap-4 px-6'}`}>
        <img src="/favicon.png" alt="PDC Logo" className="h-10 w-10 shrink-0 object-contain rounded-[var(--radius-asym-a)]" />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <span className="block text-lg font-semibold text-[var(--ink-primary)] tracking-tight">PDC</span>
            <span className="block text-xs font-medium text-[var(--ink-secondary)]">Por Dentro do Curso</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-6 scrollbar-none">
        <ul className={`space-y-1 ${collapsed ? 'px-2' : 'px-4 space-y-4'}`}>
          {visibleItems.map((item) =>
            item.type === 'group' ? renderGroup(item) : renderLeaf(item)
          )}
        </ul>
      </nav>

      {/* ── Footer fixo: Configurações + Sair ── */}
      <div className={`shrink-0 py-3 ${collapsed ? 'px-2 space-y-1' : 'px-3 space-y-0.5'}`}>
        <div className="mx-4 h-px bg-[var(--chrome-border)] mb-3 opacity-50" />
        <button
          onClick={() => { onNavigate?.(); navigate('/app/configuracoes'); }}
          title={collapsed ? 'Configurações' : undefined}
          className={`flex w-full items-center rounded-lg transition-colors duration-150 min-h-[44px] text-[var(--ink-secondary)] hover:bg-[var(--chrome-surface-strong)] hover:text-[var(--ink-primary)] ${
            collapsed ? 'justify-center px-0 py-3 mx-0' : 'gap-3 px-3 py-2 text-sm mx-0'
          }`}
        >
          <Settings size={18} className="shrink-0" />
          {!collapsed && <span>Configurações</span>}
        </button>
        <button
          onClick={() => { void logout(); }}
          title={collapsed ? 'Sair do PDC' : undefined}
          className={`flex w-full items-center rounded-lg transition-colors duration-150 min-h-[44px] hover:bg-red-500/10 ${
            collapsed ? 'justify-center px-0 py-3 mx-0' : 'gap-3 px-3 py-2 text-sm mx-0'
          }`}
          style={{ color: '#ef4444' }}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Sair do PDC</span>}
        </button>
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

  const comKey = `comunidade:${ALL_ROLES.join(',')}`;
  const defaults: Record<string, boolean> = { [comKey]: true };

  if (role === 'estudante') {
    defaults['aprender:estudante'] = true;
    defaults['meu_futuro:estudante'] = true;
  }

  return defaults;
}

function saveGroupState(role: Role, state: Record<string, boolean>): void {
  try {
    localStorage.setItem(getStorageKey(role), JSON.stringify(state));
  } catch { /* ignore */ }
}

interface SidebarContentProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}
