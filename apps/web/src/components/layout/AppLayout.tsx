import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { SidebarContent } from './Sidebar';
import { TopBar } from './TopBar';
import { AppErrorBoundary } from '../ui/AppErrorBoundary';
import { TinaChat } from '@/features/tina/TinaChat';
import { useNotificacoes } from '@/lib/realtime/useNotificacoes';

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const SIDEBAR_STORAGE_KEY = 'sidebar:collapsed';

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
export function AppLayout() {
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

  useNotificacoes();

  // Fecha o drawer em mudanças de rota
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-primary)] antialiased">
      {/* ── Desktop sidebar (fixed, collapsible) ── */}
      <motion.aside
        className="hidden lg:flex shrink-0"
        animate={{ width: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
        transition={reduced ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 280 }}
      >
        <motion.div
          className="fixed top-0 bottom-0 flex flex-col border-r border-[var(--glass-border-light)] bg-[var(--surface-recessed)] shadow-xl overflow-hidden"
          animate={{ width: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
          transition={reduced ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 280 }}
        >
          <SidebarContent collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
        </motion.div>
      </motion.aside>

      {/* ── Main content area ── */}
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar onOpenMobileMenu={() => { setDrawerOpen(true); }} />

        <main className="flex-1 relative">
          <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
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
              className="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--glass-border-light)] bg-[var(--surface-recessed)] lg:hidden w-[260px]"
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
