import type { ReactNode } from 'react';
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
  return (
    <div className="relative flex min-h-[calc(100vh-64px)] bg-canvas">
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
      />

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Fechar currículo"
          className="fixed inset-0 top-16 z-30 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
        />
      ) : null}

      {collapsed ? (
        <button
          type="button"
          onClick={onExpand}
          aria-label="Mostrar currículo"
          className="fixed left-4 top-20 z-20 hidden min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-elevated text-ink-secondary shadow-lg hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:flex"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      ) : null}

      {children}
    </div>
  );
}
