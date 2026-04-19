import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { simulacoesApi } from '../../lib/api/simulacoes';
import { Tipo1Player } from './Tipo1Player';
import { Tipo2Player } from './Tipo2Player';
import { Tipo3Player } from './Tipo3Player';
import { Spinner, Button } from '../../components/ui';

export const SimulacaoPlayerPage = () => {
  const { id } = useParams<{ id: string }>();

  const { data: simulacao, isLoading: loading } = useQuery({
    queryKey: ['simulacao', id],
    queryFn: () => simulacoesApi.getById(id ?? ''),
    enabled: !!id,
  });

  if (loading) return <div className="flex justify-center p-20"><Spinner /></div>;
  if (!simulacao) return (
    <div className="text-center py-20">
      <p className="text-gray-500 mb-4">Simulação não encontrada.</p>
      <Link to="/app/simulacoes">
        <Button variant="secondary">Voltar para lista</Button>
      </Link>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{simulacao.titulo}</h1>
          <p className="text-slate-500 font-medium">Sessão de Experiência Profissional Ativa</p>
        </div>
        <Link to={`/app/simulacoes/${id ?? ''}`}>
          <Button variant="ghost" className="text-slate-400 hover:text-red-500 hover:bg-red-50">
            Sair da Simulação
          </Button>
        </Link>
      </div>
      
      <div className="relative">
        {simulacao.tipo === 1 && <Tipo1Player simulacao={simulacao} />}
        {simulacao.tipo === 2 && <Tipo2Player simulacao={simulacao} />}
        {simulacao.tipo === 3 && <Tipo3Player simulacao={simulacao} />}
        {(simulacao.tipo < 1 || simulacao.tipo > 3) && (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <h3 className="text-lg font-bold text-slate-700">Simulador Tipo {String(simulacao.tipo)} não suportado</h3>
            <p className="text-slate-500">Aguardando implementação de novos modelos experimentais.</p>
            <Link to="/app/simulacoes" className="mt-6 block">
              <Button variant="secondary">Escolher outra simulação</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
