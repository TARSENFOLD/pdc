import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const Pagination = ({ page, pageCount, onPageChange, className }: PaginationProps) => {
  const canPreviousPage = page > 1;
  const canNextPage = page < pageCount;

  return (
    <div className={cn('flex items-center justify-center space-x-2 py-4', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { onPageChange(page - 1); }}
        disabled={!canPreviousPage}
        className="h-8 w-8 p-0"
      >
        <span className="sr-only">Anterior</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </Button>
      <div className="flex items-center text-sm font-medium text-text-secondary">
        Página {page} de {pageCount}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { onPageChange(page + 1); }}
        disabled={!canNextPage}
        className="h-8 w-8 p-0"
      >
        <span className="sr-only">Próxima</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </Button>
    </div>
  );
};

export { Pagination };
