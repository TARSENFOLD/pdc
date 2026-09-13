import type { RefObject } from 'react';
import type { Curso, ProgressoItem } from '@pdc/shared';
import { Check, ChevronLeft, Circle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { countCurrentCompletedItems } from './course-progress';

interface CoursePlayerSidebarProps {
  curso: Curso;
  progresso: ProgressoItem[];
  activeItemId?: string;
  mobileOpen: boolean;
  collapsed: boolean;
  onCloseMobile: () => void;
  onCollapse: () => void;
  onOpenOverview: () => void;
  onOpenItem: (itemId: string | number) => void;
  containerRef?: RefObject<HTMLElement>;
}

function routeId(value: unknown): string {
  return String(value);
}

export function CoursePlayerSidebar({
  curso,
  progresso,
  activeItemId,
  mobileOpen,
  collapsed,
  onCloseMobile,
  onCollapse,
  onOpenOverview,
  onOpenItem,
  containerRef,
}: CoursePlayerSidebarProps): React.JSX.Element {
  const allItems = curso.modulos?.flatMap((module) => module.itens) ?? [];
  const completedCount = countCurrentCompletedItems(
    allItems.map((item) => routeId(item.id)),
    progresso
  );
  const progressPercent =
    allItems.length > 0 ? Math.round((completedCount / allItems.length) * 100) : 0;

  return (
    <aside
      ref={containerRef}
      className={cn(
        'border-border bg-recessed fixed top-16 bottom-0 left-0 z-40 flex w-[min(88vw,320px)] flex-col border-r shadow-2xl transition-transform lg:sticky lg:top-16 lg:z-20 lg:h-[calc(100vh-4rem)] lg:w-[320px] lg:shrink-0 lg:shadow-none',
        mobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible',
        collapsed ? 'lg:hidden' : 'lg:translate-x-0'
      )}
      aria-label="Navegação do curso"
      role={mobileOpen ? 'dialog' : undefined}
      aria-modal={mobileOpen ? true : undefined}
    >
      <div className="border-border border-b px-5 py-5">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onOpenOverview}
            className="focus-visible:ring-accent min-w-0 flex-1 text-left focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="font-display text-ink-primary line-clamp-2 text-xl">
              {curso.titulo}
            </span>
            <span className="text-ink-tertiary mt-1 block text-xs">Página inicial do curso</span>
          </button>
          <button
            data-course-sidebar-close
            type="button"
            onClick={onCloseMobile}
            aria-label="Fechar currículo"
            className="text-ink-secondary hover:bg-elevated flex min-h-11 min-w-11 items-center justify-center rounded-lg lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Ocultar currículo"
            className="text-ink-secondary hover:bg-elevated hidden min-h-11 min-w-11 items-center justify-center rounded-lg lg:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="text-ink-secondary mt-5 flex items-center justify-between text-xs">
          <span>
            {completedCount} de {allItems.length} concluídos
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="bg-border mt-2 h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-accent h-full transition-all"
            style={{ width: `${String(progressPercent)}%` }}
          />
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-3" aria-label="Currículo do curso">
        {curso.modulos?.map((module, moduleIndex) => (
          <section key={module.id} className="mb-5">
            <div className="px-3 pb-2">
              <p className="text-ink-primary text-xs font-semibold">Módulo {moduleIndex + 1}</p>
              <p className="text-ink-tertiary mt-1 text-xs">{module.titulo}</p>
            </div>
            <div className="space-y-1">
              {module.itens.map((moduleItem, itemIndex) => {
                const moduleItemId = routeId(moduleItem.id);
                const isCurrent = moduleItemId === activeItemId;
                const isComplete = progresso.some(
                  (entry) => entry.itemId === moduleItemId && entry.concluido
                );
                return (
                  <button
                    key={moduleItemId}
                    type="button"
                    onClick={() => {
                      onOpenItem(moduleItem.id);
                    }}
                    className={cn(
                      'focus-visible:ring-accent flex min-h-12 w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
                      isCurrent
                        ? 'bg-accent/10 text-accent'
                        : 'text-ink-secondary hover:bg-elevated hover:text-ink-primary'
                    )}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    {isComplete ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span>
                      <span className="text-ink-tertiary block text-xs uppercase">
                        {moduleIndex + 1}.{itemIndex + 1} · {moduleItem.tipo}
                      </span>
                      <span className="mt-0.5 block text-sm font-medium">{moduleItem.titulo}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
