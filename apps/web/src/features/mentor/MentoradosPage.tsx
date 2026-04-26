import { useQuery } from '@tanstack/react-query';
import { mentoriasApi, type EstudanteMentorado } from '@/lib/api/mentorias';
import { Table, ListRowSkeleton, Badge, Button, Avatar, type Column } from '@/components/ui';
import { Link } from 'react-router-dom';
import { User, MessageSquare } from 'lucide-react';

export function MentoradosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['mentor', 'mentorados'],
    queryFn: () => mentoriasApi.getMentorados(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold font-sora">Os Meus Mentorados</h1>
        <div className="space-y-4">
          <ListRowSkeleton />
          <ListRowSkeleton />
          <ListRowSkeleton />
        </div>
      </div>
    );
  }

  const mentorados = data ?? [];

  const columns: Column<EstudanteMentorado>[] = [
    {
      header: 'Estudante',
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <Avatar fallback={row.estudanteNome[0] || '?'} size="sm" />
          <div className="flex flex-col">
            <span className="font-medium text-ink-primary">{row.estudanteNome}</span>
            <span className="text-xs text-ink-tertiary">{row.estudanteEmail}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Tipo de Mentoria',
      accessor: (row) => {
        const labels: Record<string, string> = {
          orientacao_vocacional: 'Orientação Vocacional',
          acompanhamento_curso: 'Acompanhamento de Curso',
          revisao_projeto: 'Revisão de Projecto',
        };
        return labels[row.tipo] || row.tipo;
      },
    },
    {
      header: 'Estado',
      accessor: (row) => (
        <Badge variant="success" className="capitalize">
          {row.estado}
        </Badge>
      ),
    },
    {
      header: 'Acções',
      accessor: (row) => (
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to={`/perfil/${row.estudanteId}`}>
              <User className="h-4 w-4 mr-2" />
              Perfil
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/mensagens">
              <MessageSquare className="h-4 w-4 mr-2" />
              Mensagem
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-sora">Os Meus Mentorados</h1>
      <Table 
        columns={columns} 
        data={mentorados} 
        emptyMessage="Nenhum mentorado activo."
      />
    </div>
  );
}
