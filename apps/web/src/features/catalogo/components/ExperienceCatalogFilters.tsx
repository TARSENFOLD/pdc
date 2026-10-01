import type React from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ChevronDown } from 'lucide-react';
import { AREAS, MODALIDADES, NIVEIS } from './experience-catalog-options';

type Props = {
  search: string;
  area: string;
  modalidade: string;
  nivel: string;
  hasFilters: boolean;
  clearFilters: () => void;
  isLoading: boolean;
  total: number;
  setParam: (key: string, value: string) => void;
};
export function ExperienceCatalogFilters({
  search,
  area,
  modalidade,
  nivel,
  hasFilters,
  clearFilters,
  isLoading,
  total,
  setParam,
}: Props) {
  return (
    <div
      className="border-border flex flex-wrap items-center gap-3 border-b pb-4"
      role="search"
      aria-label="Filtros de experiências"
    >
      {/* Search */}
      <div className="relative min-w-[200px] flex-1">
        <input
          id="exp-search"
          type="search"
          value={search}
          onChange={(e) => {
            setParam('q', e.target.value);
          }}
          placeholder="Pesquisar experiências..."
          className="border-border bg-elevated text-ink-primary placeholder:text-ink-tertiary focus:border-accent w-full rounded-sm border py-2 pr-4 pl-4 text-sm transition-colors focus:outline-none"
          aria-label="Pesquisar experiências"
        />
      </div>

      {/* Área */}
      <div className="relative">
        <Select
          aria-label="Filtrar por área"
          value={area}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setParam('area', e.target.value);
          }}
          className="border-border bg-elevated appearance-none rounded-sm border py-2 pr-8 pl-3 text-sm"
        >
          <option value="">Todas as áreas</option>
          {AREAS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </Select>
        <ChevronDown
          size={14}
          className="text-ink-tertiary pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
        />
      </div>

      {/* Modalidade */}
      <div className="relative">
        <Select
          aria-label="Filtrar por modalidade"
          value={modalidade}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setParam('modalidade', e.target.value);
          }}
          className="border-border bg-elevated appearance-none rounded-sm border py-2 pr-8 pl-3 text-sm"
        >
          {MODALIDADES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
        <ChevronDown
          size={14}
          className="text-ink-tertiary pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
        />
      </div>

      {/* Nível */}
      <div className="relative">
        <Select
          aria-label="Filtrar por nível"
          value={nivel}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setParam('nivel', e.target.value);
          }}
          className="border-border bg-elevated appearance-none rounded-sm border py-2 pr-8 pl-3 text-sm"
        >
          {NIVEIS.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </Select>
        <ChevronDown
          size={14}
          className="text-ink-tertiary pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
        />
      </div>

      {/* Limpar filtros */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Limpar filtros
        </Button>
      )}

      {/* Contagem */}
      {!isLoading && (
        <span className="text-ink-tertiary ml-auto text-xs tabular-nums">
          {total} resultado{total !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
