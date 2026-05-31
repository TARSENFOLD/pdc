import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import type React from 'react';
import { catalogoApi } from '@/lib/api/catalogo';
import { ratingsApi } from '@/lib/api/interactions';
import { SEOHead } from '@/components/layout/SEOHead';
import { ExperienciaCard } from './components/ExperienciaCard';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { resolveCatalogHref } from '@/components/catalogo/catalogoLinks';
import { useAuth } from '@/lib/auth/auth-context';
import {
  ChevronDown,
  TrendingUp,
  Star,
  Compass,
} from 'lucide-react';
import type { ExperienciaPublica, AreaVocacional } from '@pdc/shared';

// ─── Constantes canónicas (Spec 04) ──────────────────────────────────────────

const AREAS: Array<{ value: AreaVocacional; label: string }> = [
  { value: 'SAUDE', label: 'Saúde' },
  { value: 'ENGENHARIA', label: 'Engenharia' },
  { value: 'TECNOLOGIA', label: 'Tecnologia' },
  { value: 'DIREITO', label: 'Direito' },
  { value: 'GESTAO', label: 'Gestão' },
  { value: 'EDUCACAO', label: 'Educação' },
  { value: 'ARTES', label: 'Artes' },
  { value: 'CIENCIAS_AGRARIAS', label: 'Ciências Agrárias' },
  { value: 'CIENCIAS_SOCIAIS', label: 'Ciências Sociais' },
  { value: 'COMUNICACAO', label: 'Comunicação' },
  { value: 'CIENCIAS_NATURAIS', label: 'Ciências Naturais' },
  { value: 'ARQUITETURA', label: 'Arquitetura' },
  { value: 'TURISMO_HOTELARIA', label: 'Turismo e Hotelaria' },
  { value: 'DESPORTO', label: 'Desporto' },
  { value: 'OUTRA', label: 'Outra' },
];

const MODALIDADES = [
  { value: '', label: 'Todas as modalidades' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'online', label: 'Online' },
  { value: 'hibrido', label: 'Híbrido' },
];

const NIVEIS = [
  { value: '', label: 'Todos os níveis' },
  { value: 'basico', label: 'Básico' },
  { value: 'medio', label: 'Médio' },
  { value: 'avancado', label: 'Avançado' },
];

// ─── Sidebar: Áreas em destaque ───────────────────────────────────────────────

function AreasDestaque({
  experiencias,
  onAreaClick,
  selectedArea,
}: {
  experiencias: ExperienciaPublica[];
  onAreaClick: (area: string) => void;
  selectedArea: string;
}) {
  // Contar experiências por área a partir dos dados reais
  const counts = experiencias.reduce<Record<string, number>>((acc, exp) => {
    if (exp.area) {
      acc[exp.area] = (acc[exp.area] ?? 0) + 1;
    }
    return acc;
  }, {});

  const topAreas = AREAS
    .map((a) => ({ ...a, count: counts[a.value] ?? 0 }))
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  if (topAreas.length === 0) return null;

  return (
    <section aria-label="Áreas em destaque">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary mb-3 flex items-center gap-2">
        <TrendingUp size={13} />
        Áreas em destaque
      </h2>
      <ul className="space-y-1">
        {topAreas.map((area) => (
          <li key={area.value}>
            <button
              type="button"
              onClick={() => { onAreaClick(selectedArea === area.value ? '' : area.value); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-sm transition-colors ${
                selectedArea === area.value
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-ink-secondary hover:bg-elevated hover:text-ink-primary'
              }`}
            >
              <span>{area.label}</span>
              <span className="text-xs text-ink-tertiary tabular-nums">{area.count}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Sidebar: Recomendações biométricas ───────────────────────────────────────

function RecomendacoesSidebar() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['experiencias-recomendadas'],
    queryFn: () => catalogoApi.getExperienciasRecomendadas(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  if (!isAuthenticated) return null;

  const items = data?.data ?? [];

  return (
    <section aria-label="Recomendado para ti">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary mb-3 flex items-center gap-2">
        <Compass size={13} />
        Recomendado para ti
      </h2>

      {isLoading && (
        <div className="py-4 flex justify-center">
          <Spinner size="sm" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <p className="text-xs text-ink-tertiary px-1">
          Completa mais simulações para receber recomendações personalizadas.
        </p>
      )}

      {!isLoading && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="py-3 border-b border-border last:border-0">
              <p className="text-sm font-medium text-ink-primary line-clamp-2 mb-1">{item.titulo}</p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success uppercase tracking-wide">
                  <Star size={9} fill="currentColor" />
                  {item.matchPercentagem}% match
                </span>
              </div>
              <p className="text-xs text-ink-tertiary mt-1 line-clamp-2">{item.motivo}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── StarRatingWidget ─────────────────────────────────────────────────────────

function StarRatingWidget({ expId }: { expId: string }) {
  const [hover, setHover] = useState(0);
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['rating-stats', 'experiencia', expId],
    queryFn: () => ratingsApi.getStats('experiencia', expId),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });

  // BUG-006: mutação de rating em falta — stars sem onClick não registavam nada
  const ratingMutation = useMutation({
    mutationFn: (valor: number) => ratingsApi.create({ targetType: 'experiencia', targetId: expId, valor }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rating-stats', 'experiencia', expId] });
    },
  });

  if (!isAuthenticated || !stats) return null;

  return (
    <div className="flex items-center gap-0.5" title={`Tua avaliação: ${String(stats.userRating ?? 'Sem avaliação')}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          className={`cursor-pointer transition-colors ${
            star <= (hover || stats.userRating || 0)
              ? 'text-warning fill-warning'
              : 'text-ink-tertiary/40'
          }`}
          onMouseEnter={() => { setHover(star); }}
          onMouseLeave={() => { setHover(0); }}
          onClick={() => { ratingMutation.mutate(star); }}
        />
      ))}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function ExperienciasCatalogoPage(): React.JSX.Element {
  const [sp, setSp] = useSearchParams();
  const { isAuthenticated } = useAuth();

  const area = sp.get('area') ?? '';
  const search = sp.get('q') ?? '';
  const nivel = sp.get('nivel') ?? '';
  const modalidade = sp.get('modalidade') ?? '';
  const parsedPage = Number.parseInt(sp.get('page') ?? '1', 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['catalogo-experiencias', area, search, nivel, modalidade, page],
    queryFn: () =>
      catalogoApi.getExperiencias({
        ...(area ? { area } : {}),
        ...(search ? { search } : {}),
        ...(nivel ? { nivel } : {}),
        ...(modalidade ? { modalidade } : {}),
        page,
        pageSize: 12,
      }),
  });

  const experiencias = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = data?.meta.pageCount ?? 1;
  const hasFilters = Boolean(area || search || nivel || modalidade);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setSp(next, { replace: true });
  }

  function clearFilters() {
    setSp(new URLSearchParams());
  }

  return (
    <>
      <SEOHead
        title="Experiências — PDC"
        description="Roteiros imersivos em instituições de elite para validar o teu interesse real antes de escolher o teu percurso."
        url="https://usepdc.com/experiencias"
      />

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-ink-primary">Experiências</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Roteiros imersivos em instituições de elite — descobre antes de escolher.
          </p>
        </header>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border" role="search" aria-label="Filtros de experiências">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              id="exp-search"
              type="search"
              value={search}
              onChange={(e) => { setParam('q', e.target.value); }}
              placeholder="Pesquisar experiências..."
              className="w-full pl-4 pr-4 py-2 rounded-sm border border-border bg-elevated text-sm text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-accent transition-colors"
              aria-label="Pesquisar experiências"
            />
          </div>

          {/* Área */}
          <div className="relative">
            <Select
              aria-label="Filtrar por área"
              value={area}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setParam('area', e.target.value); }}
              className="pr-8 pl-3 py-2 rounded-sm border border-border bg-elevated text-sm appearance-none"
            >
              <option value="">Todas as áreas</option>
              {AREAS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </Select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
          </div>

          {/* Modalidade */}
          <div className="relative">
            <Select
              aria-label="Filtrar por modalidade"
              value={modalidade}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setParam('modalidade', e.target.value); }}
              className="pr-8 pl-3 py-2 rounded-sm border border-border bg-elevated text-sm appearance-none"
            >
              {MODALIDADES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
          </div>

          {/* Nível */}
          <div className="relative">
            <Select
              aria-label="Filtrar por nível"
              value={nivel}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setParam('nivel', e.target.value); }}
              className="pr-8 pl-3 py-2 rounded-sm border border-border bg-elevated text-sm appearance-none"
            >
              {NIVEIS.map((n) => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </Select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
          </div>

          {/* Limpar filtros */}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}

          {/* Contagem */}
          {!isLoading && (
            <span className="ml-auto text-xs text-ink-tertiary tabular-nums">
              {total} resultado{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Main Grid + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-10">

          {/* ── Main column ── */}
          <main aria-label="Lista de experiências">
            {/* Estado: Loading */}
            {isLoading && (
              <div className="flex justify-center py-16">
                <Spinner size="md" />
              </div>
            )}

            {/* Estado: Erro */}
            {!isLoading && error && (
              <div className="py-12 text-center space-y-3">
                <p className="text-sm text-ink-secondary">Não foi possível carregar as experiências.</p>
                <Button variant="outline" size="sm" onClick={() => { void refetch(); }}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {/* Estado: Sem resultados */}
            {!isLoading && !error && experiencias.length === 0 && (
              <div className="py-12 text-center space-y-3">
                <p className="text-sm font-medium text-ink-primary">
                  {hasFilters ? 'Nenhuma experiência encontrada com estes filtros.' : 'Nenhuma experiência disponível de momento.'}
                </p>
                {hasFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                )}
              </div>
            )}

            {/* Grelha de cards */}
            {!isLoading && !error && experiencias.length > 0 && (
              <>
                <ul
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5"
                  role="list"
                  aria-label="Experiências disponíveis"
                >
                  {experiencias.map((exp: ExperienciaPublica) => (
                    <li key={exp.id} className="flex flex-col">
                      <ExperienciaCard
                        experiencia={exp}
                        href={resolveCatalogHref('experiencia', exp.slug || exp.id, true)}
                      />
                      {/* Rating widget inline por card — apenas para utilizadores autenticados */}
                      {isAuthenticated && (
                        <div className="mt-1 px-1">
                          <StarRatingWidget expId={exp.id} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Paginação */}
                {pageCount > 1 && (
                  <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Paginação">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => { setParam('page', String(page - 1)); }}
                      aria-label="Página anterior"
                    >
                      Anterior
                    </Button>
                    <span className="text-xs text-ink-tertiary tabular-nums">
                      {page} / {pageCount}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pageCount}
                      onClick={() => { setParam('page', String(page + 1)); }}
                      aria-label="Próxima página"
                    >
                      Próxima
                    </Button>
                  </nav>
                )}
              </>
            )}
          </main>

          {/* ── Sidebar ── */}
          <aside className="space-y-8 lg:sticky lg:top-6 lg:self-start" aria-label="Painel lateral">
            <AreasDestaque
              experiencias={experiencias}
              onAreaClick={(val) => { setParam('area', val); }}
              selectedArea={area}
            />

            <div className="border-t border-border pt-6">
              <RecomendacoesSidebar />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
