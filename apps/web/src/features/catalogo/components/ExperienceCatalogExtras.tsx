import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { catalogoApi } from '@/lib/api/catalogo';
import { ratingsApi } from '@/lib/api/interactions';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth/auth-context';
import { TrendingUp, Star, Compass } from 'lucide-react';
import type { ExperienciaPublica } from '@pdc/shared';
import { AREAS } from './experience-catalog-options';

// ─── Sidebar: Áreas em destaque ───────────────────────────────────────────────

export function AreasDestaque({
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

  const topAreas = AREAS.map((a) => ({ ...a, count: counts[a.value] ?? 0 }))
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  if (topAreas.length === 0) return null;

  return (
    <section aria-label="Áreas em destaque">
      <h2 className="text-ink-tertiary mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
        <TrendingUp size={13} />
        Áreas em destaque
      </h2>
      <ul className="space-y-1">
        {topAreas.map((area) => (
          <li key={area.value}>
            <button
              type="button"
              onClick={() => {
                onAreaClick(selectedArea === area.value ? '' : area.value);
              }}
              className={`flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors ${
                selectedArea === area.value
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-ink-secondary hover:bg-elevated hover:text-ink-primary'
              }`}
            >
              <span>{area.label}</span>
              <span className="text-ink-tertiary text-xs tabular-nums">{area.count}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Sidebar: Recomendações biométricas ───────────────────────────────────────

export function RecomendacoesSidebar() {
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
      <h2 className="text-ink-tertiary mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
        <Compass size={13} />
        Recomendado para ti
      </h2>

      {isLoading && (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <p className="text-ink-tertiary px-1 text-xs">
          Completa mais simulações para receber recomendações personalizadas.
        </p>
      )}

      {!isLoading && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="border-border border-b py-3 last:border-0">
              <p className="text-ink-primary mb-1 line-clamp-2 text-sm font-medium">
                {item.titulo}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-success inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase">
                  <Star size={9} fill="currentColor" />
                  {item.matchPercentagem}% match
                </span>
              </div>
              <p className="text-ink-tertiary mt-1 line-clamp-2 text-xs">{item.motivo}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── StarRatingWidget ─────────────────────────────────────────────────────────

export function StarRatingWidget({ expId }: { expId: string }) {
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
    mutationFn: (valor: number) =>
      ratingsApi.create({ targetType: 'experiencia', targetId: expId, valor }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rating-stats', 'experiencia', expId] });
    },
  });

  if (!isAuthenticated || !stats) return null;

  return (
    <div
      className="flex items-center gap-0.5"
      title={`Tua avaliação: ${String(stats.userRating ?? 'Sem avaliação')}`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          className={`cursor-pointer transition-colors ${
            star <= (hover || stats.userRating || 0)
              ? 'text-warning fill-warning'
              : 'text-ink-tertiary/40'
          }`}
          onMouseEnter={() => {
            setHover(star);
          }}
          onMouseLeave={() => {
            setHover(0);
          }}
          onClick={() => {
            ratingMutation.mutate(star);
          }}
        />
      ))}
    </div>
  );
}
