import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Badge } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';
import { EmptyState } from '@/components/ui/EmptyState';
import { Search } from 'lucide-react';

import type { SimulacaoPublica } from '@pdc/shared';

const TIPOS: Record<string, string> = { '1': 'Vídeo Guiado', '2': 'Laboratório Externo', '3': 'Ambiente Interactivo' };

export function SimulacaoPublicoDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: sim, isLoading, isError } = useQuery<SimulacaoPublica | null>({
    queryKey: ['catalogo-simulacao', slug],
    queryFn: async () => {
      if (!slug) return null;
      return catalogoApi.getSimulacao(slug);
    },
    enabled: !!slug,
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><Spinner size="lg" /></div>;
  if (isError || !sim) return <div className="flex min-h-screen items-center justify-center bg-background p-4"><EmptyState icon={Search} title="Simulação não encontrada" description="Não foi possível carregar os dados desta simulação." /></div>;

  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <SEOHead 
        title={sim.titulo}
        description={sim.descricao}
        image={sim.capaUrl}
        url={`https://usepdc.com/simulacoes/${slug ?? ''}`}
        type="article"
      />
      <div className="mx-auto max-w-3xl">
        <Link to="/simulacoes" className="text-sm text-text-muted hover:text-text-secondary">← Voltar às simulações</Link>

        {sim.capaUrl ? <img src={sim.capaUrl} alt={sim.titulo} className="mt-6 w-full rounded-2xl object-cover" /> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Badge variant="warning">{TIPOS[String(sim.tipo)] ?? 'Simulação'}</Badge>
          {sim.area && <Badge variant="info">{sim.area}</Badge>}
          {sim.nivel ? <Badge variant="outline">{sim.nivel}</Badge> : null}
        </div>

        <h1 className="mt-4 text-3xl font-bold text-text-primary">{sim.titulo}</h1>
        <p className="mt-2 text-text-secondary">{sim.descricao}</p>

        <div className="mt-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">O que vais experimentar</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {sim.area && <li>• Cenário realista de {sim.area}</li>}
            <li>• Relatório de perfil vocacional no final</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link to="/login" className="rounded-xl bg-amber px-6 py-3 text-center text-sm font-semibold text-black transition-colors hover:bg-amber-hover">
            Experimentar esta simulação
          </Link>
          <Link to="/simulacoes" className="rounded-xl border border-border px-6 py-3 text-center text-sm text-text-secondary transition-colors hover:bg-surface-raised">
            Ver mais simulações
          </Link>
        </div>
      </div>
    </div>
  );
}
