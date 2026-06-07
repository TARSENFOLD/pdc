import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import SidebarContent from './Sidebar';
import TopBar from './TopBar';
import { AppErrorBoundary } from '../ui/AppErrorBoundary';
import { TinaChat } from '@/features/tina/TinaChat';
import { useNotificacoes } from '@/lib/realtime/useNotificacoes';

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const SIDEBAR_STORAGE_KEY = 'sidebar:collapsed';

const FOCUS_MODE_ROUTES = [
  /^\/app\/(?:mentor|instituicao)\/cursos\/(?:criar|[^/]+\/editar)\/?$/,
  /^\/app\/(?:mentor|instituicao)\/simulacoes\/(?:criar|[^/]+\/editar|editar\/[^/]+)\/?$/,
  /^\/app\/instituicao\/(?:criar-experiencia|editar-experiencia\/[^/]+)\/?$/,
  /^\/app\/instituicao\/(?:criar-programa|editar-programa\/[^/]+)\/?$/,
  /^\/app\/cursos\/[^/]+\/itens\/[^/]+\/?$/,
  /^\/app\/experiencias\/[^/]+\/?$/,
  /^\/app\/simulacoes\/[^/]+\/play\/?$/,
];

function isFocusMode(pathname: string): boolean {
  return FOCUS_MODE_ROUTES.some((pattern) => pattern.test(pathname));
}

function loadCollapsed(): boolean {
  try { return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'; } catch { return false; }
}
function saveCollapsed(v: boolean): void {
  try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(v)); } catch { /* ignore */ }
}

/**
 * AppLayout - Estrutura principal da aplicação.
 * Unificada para usar tokens via Tailwind e suporte a acessibilidade (Reduced Motion).
 */
export default function AppLayout(): React.JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(loadCollapsed);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      saveCollapsed(next);
      return next;
    });
  }, []);
  const location = useLocation();
  const reduced = useReducedMotion();
  const focusMode = isFocusMode(location.pathname);

  useNotificacoes();

  // Fecha o drawer em mudanças de rota
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  if (focusMode) {
    return (
      <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-primary)] antialiased">
        <AppErrorBoundary>
          <Outlet />
        </AppErrorBoundary>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--chrome-surface)] text-[var(--ink-primary)] antialiased">
      {/* ── Desktop sidebar (fixed, collapsible) ── */}
      <motion.aside
        className="hidden lg:flex shrink-0 relative"
        animate={{ width: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
        transition={reduced ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 280 }}
      >
        <motion.div
          className="fixed top-0 bottom-0 flex flex-col bg-[var(--chrome-surface)] overflow-hidden"
          animate={{ width: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
          transition={reduced ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 280 }}
        >
          <SidebarContent collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
          {/* Faixa de resize — ocupa toda a borda direita */}
          <button
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
            className="absolute inset-y-0 right-0 w-1.5 cursor-col-resize group/resize focus-visible:outline-none"
          >
            <span className="absolute inset-y-0 right-0 w-0 transition-all duration-150 group-hover/resize:w-1 group-hover/resize:bg-[var(--accent-terracotta)] group-hover/resize:opacity-70" />
          </button>
        </motion.div>
      </motion.aside>

      {/* ── Main content area ── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <TopBar onOpenMobileMenu={() => { setDrawerOpen(true); }} />

        <main className="flex-1 min-h-0 relative bg-[var(--surface-canvas)] rounded-tl-2xl overflow-hidden">
          <div className="mx-auto max-w-[1600px] p-3 lg:p-4 h-full overflow-y-auto">
            <AppErrorBoundary>
              <Outlet />
            </AppErrorBoundary>
          </div>
        </main>
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
              onClick={() => { setDrawerOpen(false); }}
              className="fixed inset-0 z-40 bg-[var(--glass-bg-dark)] backdrop-blur-[var(--glass-blur)] lg:hidden"
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={reduced ? { opacity: 0 } : { x: -SIDEBAR_WIDTH }}
              animate={reduced ? { opacity: 1 } : { x: 0 }}
              exit={reduced ? { opacity: 0 } : { x: -SIDEBAR_WIDTH }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--chrome-border)] bg-[var(--chrome-surface)] lg:hidden w-[260px]"
            >
              <SidebarContent onNavigate={() => { setDrawerOpen(false); }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <TinaChat />
    </div>
  );
}
