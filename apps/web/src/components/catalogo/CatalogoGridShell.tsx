import React from 'react';
import { CardGridSkeleton } from '../ui/Skeleton';
import { AspirationalEmpty } from '../ui/AspirationalEmpty';
import { Button } from '../ui/Button';
import { SearchX } from 'lucide-react';

interface CatalogoGridShellProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  onClearFilters?: () => void;
  filterBar?: React.ReactNode;
  children: React.ReactNode;
  pageCount?: number;
  onPageChange?: (page: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function CatalogoGridShell({
  isLoading,
  isEmpty,
  onClearFilters,
  filterBar,
  children,
  emptyTitle = 'Sem resultados para esta área',
  emptyDescription = 'Experimenta outra área ou aguarda novos conteúdos.',
}: CatalogoGridShellProps): React.ReactElement {
  return (
    <div className="space-y-6" data-testid="catalogo">
      {filterBar}
      {isLoading ? (
        <CardGridSkeleton />
      ) : isEmpty ? (
        <AspirationalEmpty
          icon={SearchX}
          title={emptyTitle}
          description={emptyDescription}
          action={
            onClearFilters ? (
              <Button variant="outline" onClick={onClearFilters}>
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {children}
        </div>
      )}
    </div>
  );
}

export default CatalogoGridShell;
