import React from 'react';
import { CardGridSkeleton } from '../ui/Skeleton';
import { AspirationalEmpty } from '../ui/AspirationalEmpty';
import { Button } from '../ui/Button';
import { AlertTriangle, SearchX, Sparkles } from 'lucide-react';

interface CatalogoGridShellProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onClearFilters?: () => void;
  filterBar?: React.ReactNode;
  children: React.ReactNode;
  pageCount?: number;
  onPageChange?: (page: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyVariant?: 'empty' | 'zero-results';
}

export function CatalogoGridShell({
  isLoading,
  isEmpty,
  error,
  onRetry,
  onClearFilters,
  filterBar,
  children,
  emptyTitle = 'Sem resultados para esta área',
  emptyDescription = 'Experimenta outra área ou aguarda novos conteúdos.',
  emptyVariant = 'zero-results',
}: CatalogoGridShellProps): React.ReactElement {
  const EmptyIcon = emptyVariant === 'empty' ? Sparkles : SearchX;

  return (
    <div className="space-y-6" data-testid="catalogo">
      {filterBar}
      {error ? (
        <AspirationalEmpty
          icon={AlertTriangle}
          title="Não foi possível carregar este catálogo"
          description="A ligação ao catálogo falhou. Tenta novamente sem perder os filtros atuais."
          action={
            onRetry ? (
              <Button variant="outline" onClick={onRetry}>
                Tentar novamente
              </Button>
            ) : undefined
          }
        />
      ) : isLoading ? (
        <CardGridSkeleton />
      ) : isEmpty ? (
        <AspirationalEmpty
          icon={EmptyIcon}
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
