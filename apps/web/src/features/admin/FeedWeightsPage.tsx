import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedApi } from '@/lib/api/feed';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import type { FeedWeights } from '@pdc/shared';

const WEIGHT_KEYS: Array<keyof FeedWeights> = [
  'engagement', 'completion', 'rating', 'recency', 'reputation', 'affinity', 'time',
];

const WEIGHT_LABELS: Record<keyof FeedWeights, string> = {
  engagement: 'Engagement (likes + interações)',
  completion: 'Completion Rate',
  rating: 'Rating Médio',
  recency: 'Recência',
  reputation: 'Reputação do Autor',
  affinity: 'Afinidade (área do utilizador)',
  time: 'Tempo no Conteúdo',
};

function WeightsSection({
  title,
  tipo,
  weights,
  onChange,
  onSave,
  isSaving,
}: {
  title: string;
  tipo: 'geral' | 'trending';
  weights: FeedWeights;
  onChange: (tipo: 'geral' | 'trending', key: keyof FeedWeights, value: number) => void;
  onSave: (tipo: 'geral' | 'trending') => void;
  isSaving: boolean;
}) {
  const total = WEIGHT_KEYS.reduce((sum, k) => sum + weights[k], 0);
  const isValid = Math.abs(total - 1.0) <= 0.05;

  return (
    <div className="bg-elevated border border-ink-tertiary/10 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-primary">{title}</h2>
        <span className={`text-sm font-medium ${isValid ? 'text-green-500' : 'text-red-500'}`}>
          Soma: {total.toFixed(2)}
        </span>
      </div>

      <div className="space-y-3">
        {WEIGHT_KEYS.map(key => (
          <div key={key} className="flex items-center gap-4">
            <label className="w-56 text-sm text-ink-secondary shrink-0">
              {WEIGHT_LABELS[key]}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights[key]}
              onChange={(e) => { onChange(tipo, key, parseFloat(e.target.value)); }}
              className="flex-1 accent-accent"
            />
            <span className="text-sm font-mono text-ink-primary w-12 text-right">
              {weights[key].toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={() => { onSave(tipo); }}
          disabled={!isValid || isSaving}
        >
          {isSaving ? 'A guardar...' : 'Guardar'}
        </Button>
      </div>
      {!isValid && (
        <p className="text-xs text-red-500">
          A soma dos pesos deve ser aproximadamente 1.0 (±0.05).
        </p>
      )}
    </div>
  );
}

export default function FeedWeightsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const geralQuery = useQuery({
    queryKey: ['feed-weights', 'geral'],
    queryFn: () => feedApi.getWeights('geral'),
  });

  const trendingQuery = useQuery({
    queryKey: ['feed-weights', 'trending'],
    queryFn: () => feedApi.getWeights('trending'),
  });

  const [geralWeights, setGeralWeights] = useState({
    engagement: 0.2, completion: 0.15, rating: 0.15, recency: 0.15,
    reputation: 0.1, affinity: 0.15, time: 0.1,
  });

  const [trendingWeights, setTrendingWeights] = useState({
    engagement: 0.3, completion: 0.1, rating: 0.2, recency: 0.2,
    reputation: 0.1, affinity: 0.05, time: 0.05,
  });

  useEffect(() => {
    if (geralQuery.data) setGeralWeights(geralQuery.data);
  }, [geralQuery.data]);

  useEffect(() => {
    if (trendingQuery.data) setTrendingWeights(trendingQuery.data);
  }, [trendingQuery.data]);

  const saveMutation = useMutation({
    mutationFn: ({ tipo, weights }: { tipo: 'geral' | 'trending'; weights: FeedWeights }) =>
      feedApi.updateWeights(tipo, weights),
    onSuccess: (_data, { tipo }) => {
      toast({ title: 'Pesos guardados', description: `Feed ${tipo} actualizado.`, variant: 'success' });
      void qc.invalidateQueries({ queryKey: ['feed-weights', tipo] });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível guardar os pesos.', variant: 'error' });
    },
  });

  const handleChange = (tipo: 'geral' | 'trending', key: keyof FeedWeights, value: number) => {
    if (tipo === 'geral') {
      setGeralWeights(prev => ({ ...prev, [key]: value }));
    } else {
      setTrendingWeights(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleSave = (tipo: 'geral' | 'trending') => {
    const weights = tipo === 'geral' ? geralWeights : trendingWeights;
    saveMutation.mutate({ tipo, weights });
  };

  if (geralQuery.isLoading || trendingQuery.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-ink-primary tracking-tight">Pesos do Feed</h1>
        <p className="text-ink-secondary text-sm">
          Ajusta os pesos da fórmula de scoring para cada tipo de feed.
        </p>
      </header>

      <WeightsSection
        title="Feed Geral"
        tipo="geral"
        weights={geralWeights}
        onChange={handleChange}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
      />

      <WeightsSection
        title="Feed Trending"
        tipo="trending"
        weights={trendingWeights}
        onChange={handleChange}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
      />
    </div>
  );
}
