import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { simulacoesApi } from '../../lib/api/simulacoes';
import type { Simulacao } from '@pdc/shared';
import { Card, Button, Spinner, Badge } from '../../components/ui';

export const SimulacaoListPage = () => {
  const [simulacoes, setSimulacoes] = useState<Simulacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    simulacoesApi.list()
      .then(res => setSimulacoes(res.data))
      .catch(err => console.error('Erro ao carregar simulações:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Spinner /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Simulações de Experiência</h1>
          <p className="text-gray-500 mt-1">Experimenta diferentes profissões e descobre o teu perfil vocacional.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {simulacoes.map(sim => (
          <Card key={sim.id} className="group overflow-hidden flex flex-col hover:shadow-lg transition-all border-2 hover:border-blue-100">
            <div className="aspect-video w-full bg-gray-100 overflow-hidden">
              {sim.capaUrl ? (
                <img 
                  src={sim.capaUrl} 
                  alt={sim.titulo} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-4xl">🎓</span>
                </div>
              )}
            </div>
            
            <div className="p-6 flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline">Tipo {sim.tipo}</Badge>
              </div>
              <h3 className="text-xl font-bold line-clamp-1 group-hover:text-blue-600 transition-colors">{sim.titulo}</h3>
              <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">{sim.descricao}</p>
            </div>

            <div className="px-6 pb-6 mt-auto">
              <Link to={`/app/simulacoes/${sim.id}`} className="block w-full">
                <Button className="w-full group-hover:bg-blue-600">Explorar Simulação</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {simulacoes.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <p className="text-gray-500">Nenhuma simulação disponível no momento.</p>
        </div>
      )}
    </div>
  );
};
