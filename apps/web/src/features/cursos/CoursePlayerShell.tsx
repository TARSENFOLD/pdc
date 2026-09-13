import { useEffect, useRef, type ReactNode } from 'react';
import type { Curso, ProgressoItem } from '@pdc/shared';
import { PanelLeftOpen } from 'lucide-react';
import { CoursePlayerSidebar } from './CoursePlayerSidebar';

interface CoursePlayerShellProps {
  curso: Curso;
  progresso: ProgressoItem[];
  activeItemId?: string;
  mobileOpen: boolean;
  collapsed: boolean;
  onCloseMobile: () => void;
  onCollapse: () => void;
  onExpand: () => void;
  onOpenOverview: () => void;
  onOpenItem: (itemId: string | number) => void;
  children: ReactNode;
}

export function CoursePlayerShell({
  curso,
  progresso,
  activeItemId,
  mobileOpen,
  collapsed,
  onCloseMobile,
  onCollapse,
  onExpand,
  onOpenOverview,
  onOpenItem,
  children,
}: CoursePlayerShellProps): React.JSX.Element {
  const sidebarRef = useRef<HTMLElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const closeMobileRef = useRef(onCloseMobile);

  useEffect(() => {
    closeMobileRef.current = onCloseMobile;
  }, [onCloseMobile]);

  useEffect(() => {
    if (!mobileOpen || typeof window.matchMedia !== 'function') return;
    const desktopViewport = window.matchMedia('(min-width: 1024px)');
    const closeDrawerOnDesktop = () => {
      if (desktopViewport.matches) closeMobileRef.current();
    };

    closeDrawerOnDesktop();
    desktopViewport.addEventListener('change', closeDrawerOnDesktop);
    return () => {
      desktopViewport.removeEventListener('change', closeDrawerOnDesktop);
    };
  }, [mobileOpen]);

  useEffect(() => {
    const background = backgroundRef.current;
    if (!background) return;
    if (mobileOpen) background.setAttribute('inert', '');
    else background.removeAttribute('inert');
    return () => {
      background.removeAttribute('inert');
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () => Array.from(sidebar.querySelectorAll<HTMLElement>(selector));
    (sidebar.querySelector<HTMLElement>('[data-course-sidebar-close]') ?? focusable()[0])?.focus();

    const containFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobileRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const redirectExternalFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !sidebar.contains(event.target)) {
        (
          sidebar.querySelector<HTMLElement>('[data-course-sidebar-close]') ?? focusable()[0]
        )?.focus();
      }
    };

    document.addEventListener('keydown', containFocus);
    document.addEventListener('focusin', redirectExternalFocus);
    return () => {
      document.removeEventListener('keydown', containFocus);
      document.removeEventListener('focusin', redirectExternalFocus);
      previouslyFocused?.focus();
    };
  }, [mobileOpen]);

  return (
    <div className="bg-canvas relative flex min-h-[calc(100vh-64px)]">
      <CoursePlayerSidebar
        curso={curso}
        progresso={progresso}
        {...(activeItemId ? { activeItemId } : {})}
        mobileOpen={mobileOpen}
        collapsed={collapsed}
        onCloseMobile={onCloseMobile}
        onCollapse={onCollapse}
        onOpenOverview={onOpenOverview}
        onOpenItem={onOpenItem}
        containerRef={sidebarRef}
      />

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Fechar currículo"
          tabIndex={-1}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
        />
      ) : null}

      {collapsed ? (
        <button
          type="button"
          onClick={onExpand}
          aria-label="Mostrar currículo"
          className="border-border bg-elevated text-ink-secondary hover:text-ink-primary focus-visible:ring-accent fixed top-20 left-4 z-20 hidden min-h-11 min-w-11 items-center justify-center rounded-lg border shadow-lg focus-visible:ring-2 focus-visible:outline-none lg:flex"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      ) : null}

      <div ref={backgroundRef} className="contents" aria-hidden={mobileOpen ? true : undefined}>
        {children}
      </div>
    </div>
  );
}
