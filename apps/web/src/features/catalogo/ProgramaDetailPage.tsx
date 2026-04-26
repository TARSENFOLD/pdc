import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { programasApi } from '@/lib/api/programas';
import { Spinner, Badge, Button, Card } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';
import { useAuth } from '@/lib/auth/AuthContext';
import { useToast } from '@/hooks/useToast';
import { EmptyState } from '@/components/ui/EmptyState';
import { Search } from 'lucide-react';

export function ProgramaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: prog, isLoading, isError } = useQuery({
    queryKey: ['programa', id],
    queryFn: () => programasApi.getById(id ?? ''),
    enabled: !!id,
  });

  const inscreverMutation = useMutation({
    mutationFn: (id: string) => programasApi.inscrever(id),
    onSuccess: () => {
      toast({ title: 'Inscrição realizada com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro na inscrição', variant: 'error' });
    }
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-canvas"><Spinner size="lg" /></div>;
  if (isError || !prog) return <div className="flex min-h-screen items-center justify-center bg-canvas p-4"><EmptyState icon={Search} title="Programa não encontrado" description="Não foi possível carregar os dados deste programa." /></div>;

  const handleInscrever = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    inscreverMutation.mutate(prog.id);
  };

  return (
    <div className="min-h-screen bg-canvas px-4 py-16 sm:px-6">
      <SEOHead 
        title={prog.titulo}
        description={prog.descricao}
        url={`https://usepdc.com/programas/${id ?? ''}`}
      />
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-ink-primary mb-4">{prog.titulo}</h1>
        <div className="flex gap-2 mb-6">
          <Badge variant="info">{prog.tipo.toUpperCase()}</Badge>
          <Badge variant="outline">{prog.area}</Badge>
        </div>
        
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold text-ink-primary mb-4">Detalhes</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <p className="text-ink-secondary">Vagas: <span className="text-ink-primary">{prog.vagas ?? 'Ilimitadas'}</span></p>
            <p className="text-ink-secondary">Início: <span className="text-ink-primary">{prog.dataInicio ? new Date(prog.dataInicio).toLocaleDateString() : 'Não definido'}</span></p>
          </div>
          <p className="mt-4 text-ink-secondary leading-relaxed">{prog.descricao}</p>
        </Card>

        <Button onClick={handleInscrever} isLoading={inscreverMutation.isPending} className="w-full">
          Inscrever-me
        </Button>
      </div>
    </div>
  );
}
