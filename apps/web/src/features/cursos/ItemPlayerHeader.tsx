import { Menu } from 'lucide-react';
import { Button } from '@/components/ui';
import { useFocusHeader } from '@/components/layout/useFocusHeader';

interface ItemPlayerHeaderProps {
  cursoId: string;
  title: string;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  concluded: boolean;
  pending: boolean;
  onOpenCurriculum: () => void;
  onComplete: () => void;
}

export function ItemPlayerHeader(props: ItemPlayerHeaderProps): null {
  useFocusHeader({
    title: props.title,
    backTo: `/app/cursos/${props.cursoId}`,
    progress: (
      <div className="flex min-w-44 items-center gap-3">
        <div className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-border">
          <div className="h-full bg-accent" style={{ width: `${String(props.progressPercent)}%` }} />
        </div>
        <span className="whitespace-nowrap text-xs text-ink-secondary">
          {props.completedCount}/{props.totalCount}
        </span>
      </div>
    ),
    actions: (
      <>
        <button
          type="button"
          onClick={props.onOpenCurriculum}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-secondary hover:bg-recessed lg:hidden"
          aria-label="Abrir currículo"
        >
          <Menu size={20} />
        </button>
        <Button
          onClick={props.onComplete}
          isLoading={props.pending}
          disabled={props.concluded}
          variant={props.concluded ? 'secondary' : 'primary'}
          size="sm"
        >
          {props.concluded ? 'Concluído' : 'Concluir'}
        </Button>
      </>
    ),
  });
  return null;
}
