import React from 'react';
import { Spinner } from '../ui';

interface CatalogoGridShellProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  onClearFilters?: () => void;
  filterBar?: React.ReactNode;
  children: React.ReactNode;
  pageCount?: number;
  onPageChange?: (page: number) => void;
}

export function CatalogoGridShell({ 
  isLoading, 
  isEmpty, 
  onClearFilters, 
  filterBar, 
  children 
}: CatalogoGridShellProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="flex justify-center py-20" data-testid="catalogo">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="catalogo">
      {filterBar}
      {isEmpty ? (
        <div className="py-20 text-center border border-dashed rounded-3xl">
          <p className="text-ink-tertiary">Nenhum resultado encontrado.</p>
          {onClearFilters && (
            <button 
              onClick={onClearFilters} 
              className="mt-4 text-accent font-bold hover:text-accent/80 transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {children}
        </div>
      )}
    </div>
  );
}

export default CatalogoGridShell;
