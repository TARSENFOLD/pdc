import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { SidebarContent } from './Sidebar';
import { TopBar } from './TopBar';
import { AppErrorBoundary } from '../ui/AppErrorBoundary';
import { TinaChat } from '@/features/tina/TinaChat';
import { useNotificacoes } from '@/lib/realtime/useNotificacoes';

const SIDEBAR_WIDTH = 260;

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const reduced = useReducedMotion();

  useNotificacoes();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Desktop sidebar (fixed) ── */}
      <aside
        className="hidden lg:flex"
        style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
      >
        <div
          className="fixed top-0 bottom-0 flex flex-col border-r border-border bg-surface-alt shadow-2xl"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <SidebarContent />
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar onOpenMobileMenu={() => { setDrawerOpen(true); }} />

        <main className="flex-1">
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
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={reduced ? { opacity: 0 } : { x: -SIDEBAR_WIDTH }}
              animate={reduced ? { opacity: 1 } : { x: 0 }}
              exit={reduced ? { opacity: 0 } : { x: -SIDEBAR_WIDTH }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-surface-alt lg:hidden"
              style={{ width: SIDEBAR_WIDTH }}
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
