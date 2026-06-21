import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { simulacoesApi } from '../../lib/api/simulacoes';
import { Tipo1Player } from './Tipo1Player';
import { Tipo2Player } from './Tipo2Player';
import { Tipo3Player } from './Tipo3Player';
import { Spinner, Button } from '../../components/ui';
import { AspirationalEmpty } from '../../components/ui/AspirationalEmpty';
import { AlertTriangle } from 'lucide-react';

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
      <p className="mb-4 text-ink-secondary">Simulação não encontrada.</p>
      <Link to="/app/simulacoes">
        <Button variant="secondary">Voltar para lista</Button>
      </Link>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--chrome-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black text-ink-primary">{simulacao.titulo}</h1>
          <p className="font-medium text-ink-secondary">Sessão de experiência profissional ativa</p>
        </div>
        <Button variant="ghost" className="text-ink-tertiary hover:bg-error/10 hover:text-error" asChild>
          <Link to={`/app/simulacoes/${id ?? ''}`}>
            Sair da simulação
          </Link>
        </Button>
      </div>
      
      <div className="relative">
        {simulacao.tipo === 1 && <Tipo1Player simulacao={simulacao} />}
        {simulacao.tipo === 2 && <Tipo2Player simulacao={simulacao} />}
        {simulacao.tipo === 3 && <Tipo3Player simulacao={simulacao} />}
        {(simulacao.tipo < 1 || simulacao.tipo > 3) && (
          <AspirationalEmpty
            icon={AlertTriangle}
            title={`Simulação Tipo ${String(simulacao.tipo)} indisponível`}
            description="Escolhe uma das experiências disponíveis enquanto este formato é preparado."
            action={(
              <Button variant="secondary" asChild>
                <Link to="/app/simulacoes">Escolher outra simulação</Link>
              </Button>
            )}
          />
        )}
      </div>
    </div>
  );
};
