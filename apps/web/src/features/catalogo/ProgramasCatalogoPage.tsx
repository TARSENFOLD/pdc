import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { programasApi } from '@/lib/api/programas';
import { Card, Badge, CardGridSkeleton } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';

export function ProgramasCatalogoPage() {
  const [tipo, setTipo] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['programas-publicos', tipo],
    queryFn: () => programasApi.list(tipo ? { tipo } : {}),
  });

  const programas = data?.data ?? [];

  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <SEOHead title="Programas" description="Explore nossos programas educacionais" />
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Programas</h1>
        
        <div className="flex gap-2 mb-8">
          {['', 'standard', 'shadowapro', 'eduvisit'].map((t) => (
            <button 
              key={t}
              onClick={() => setTipo(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${tipo === t ? 'bg-amber text-black' : 'bg-surface text-text-secondary'}`}
            >
              {t === '' ? 'Todos' : t.toUpperCase()}
            </button>
          ))}
        </div>

        {isLoading ? <CardGridSkeleton /> : programas.length === 0 ? (
          <p className="text-text-muted">Nenhum programa disponível.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programas.map((p) => (
              <Card key={p.id} className="p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-text-primary">{p.titulo}</h3>
                    <Badge variant="info">{p.tipo.toUpperCase()}</Badge>
                  </div>
                  <p className="text-sm text-text-secondary mb-4 line-clamp-2">{p.descricao}</p>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <span className="text-sm text-text-muted">{p.area}</span>
                  <Link to={`/programas/${p.id}`} className="text-amber text-sm font-semibold hover:underline">Ver programa →</Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
