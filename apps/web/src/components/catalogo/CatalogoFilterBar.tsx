import type React from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface CatalogoFilterBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  areas: Array<{ value: string; label: string }>;
  selectedArea: string;
  onAreaChange: (val: string) => void;
  totalResults?: number | undefined;
}

const CatalogoFilterBar = ({ 
  searchTerm, 
  onSearchChange, 
  areas, 
  selectedArea, 
  onAreaChange,
  totalResults
}: CatalogoFilterBarProps): React.JSX.Element => {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-recessed/30 p-6 rounded-2xl border border-white/5">
      <div className="flex-1 w-full max-w-md">
        <Input 
          placeholder="Pesquisar..." 
          value={searchTerm} 
          onChange={(e) => { onSearchChange(e.target.value); }} 
        />
      </div>
      <div className="flex gap-4 items-center">
        <Select 
          value={selectedArea} 
          onChange={(e) => { onAreaChange(e.target.value); }}
        >
          <option value="">Todas as áreas</option>
          {areas.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </Select>
        {totalResults !== undefined && (
          <span className="text-[10px] font-black uppercase text-ink-tertiary whitespace-nowrap">
            {totalResults} resultados
          </span>
        )}
      </div>
    </div>
  );
};

export default CatalogoFilterBar;
