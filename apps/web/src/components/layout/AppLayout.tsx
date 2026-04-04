import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { SidebarContent } from './Sidebar';
import { TinaChat } from '@/features/tina/TinaChat';
import { useNotificacoes } from '@/lib/realtime/useNotificacoes';

const SIDEBAR_WIDTH = 240;

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
          className="fixed top-0 bottom-0 flex flex-col border-r border-white/5 bg-[#0d0d0d]"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <SidebarContent />
        </div>
      </aside>

      {/* ── Mobile: hamburger button ── */}
      <button
        onClick={() => { setDrawerOpen(true); }}
        className="fixed left-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#0d0d0d] text-white/70 transition-colors hover:text-white lg:hidden"
        aria-label="Abrir menu"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

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
              className="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/5 bg-[#0d0d0d] lg:hidden"
              style={{ width: SIDEBAR_WIDTH }}
            >
              {/* Close button */}
              <button
                onClick={() => { setDrawerOpen(false); }}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white"
                aria-label="Fechar menu"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <SidebarContent onNavigate={() => { setDrawerOpen(false); }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top padding for hamburger */}
        <div className="px-4 pt-16 pb-8 sm:px-6 lg:px-8 lg:pt-8">
          <Outlet />
        </div>
      </main>

      <TinaChat />
    </div>
  );
}
