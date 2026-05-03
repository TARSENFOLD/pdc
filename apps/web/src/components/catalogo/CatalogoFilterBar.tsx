import type React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '../ui/Input';

interface CatalogoFilterBarProps {
  areas: Array<{ value: string; label: string }>;
  selectedArea: string;
  onAreaChange: (val: string) => void;
  totalResults?: number | undefined;
  searchTerm?: string | undefined;
  onSearchChange?: ((val: string) => void) | undefined;
  searchLabel?: string | undefined;
}

const CatalogoFilterBar = ({
  areas,
  selectedArea,
  onAreaChange,
  totalResults,
  searchTerm,
  onSearchChange,
  searchLabel = 'Pesquisar neste catálogo',
}: CatalogoFilterBarProps): React.JSX.Element => {
  const showSearch = searchTerm !== undefined && onSearchChange !== undefined;

  return (
    <div className="space-y-3">
      {showSearch && (
        <div className="max-w-sm space-y-2">
          <label htmlFor="catalogo-search" className="block text-xs font-semibold text-ink-secondary">
            {searchLabel}
          </label>
          <Input
            id="catalogo-search"
            placeholder="Nome, área ou instituição"
            value={searchTerm}
            onChange={(e) => { onSearchChange(e.target.value); }}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => { onAreaChange(''); }}
          className={cn(
            'min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-all border',
            !selectedArea
              ? 'bg-[var(--chrome-active)] text-[var(--ink-on-accent)] border-[var(--chrome-active)]'
              : 'bg-elevated text-ink-secondary hover:bg-recessed border-ink-tertiary/10'
          )}
        >
          Todas
        </button>
        {areas.map((a) => (
          <button
            key={a.value}
            onClick={() => { onAreaChange(selectedArea === a.value ? '' : a.value); }}
            className={cn(
              'min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-all border',
              selectedArea === a.value
                ? 'bg-[var(--chrome-active)] text-[var(--ink-on-accent)] border-[var(--chrome-active)]'
                : 'bg-elevated text-ink-secondary hover:bg-recessed border-ink-tertiary/10'
            )}
          >
            {a.label}
          </button>
        ))}
        {totalResults !== undefined && (
          <span className="ml-auto text-xs text-ink-tertiary font-medium self-center">
            {totalResults} resultado{totalResults !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
};

export default CatalogoFilterBar;
