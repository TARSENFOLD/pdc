import { useQuery } from '@tanstack/react-query';
import { mentoriasApi } from '@/lib/api/mentorias';
import { Table, ListRowSkeleton, Badge, type Column } from '@/components/ui';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface InscricaoPopulated {
  id: string;
  progressoPercentagem: number;
  concluido: boolean;
  updatedAt?: string;
  estudante?: {
    nome: string;
    email: string;
  };
  curso?: {
    titulo: string;
  };
}

export function EstudantesInscritosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['mentor', 'estudantes', 'inscritos'],
    queryFn: () => mentoriasApi.getEstudantesInscritos(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold font-sora">Estudantes Inscritos</h1>
        <div className="space-y-4">
          <ListRowSkeleton />
          <ListRowSkeleton />
          <ListRowSkeleton />
        </div>
      </div>
    );
  }

  const inscricoes = (data?.data ?? []) as InscricaoPopulated[];

  const columns: Column<InscricaoPopulated>[] = [
    {
      header: 'Nome do Estudante',
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-ink-primary">{row.estudante?.nome || 'N/A'}</span>
          <span className="text-xs text-ink-tertiary">{row.estudante?.email || ''}</span>
        </div>
      ),
    },
    {
      header: 'Curso',
      accessor: (row) => row.curso?.titulo || 'N/A',
    },
    {
      header: 'Progresso',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-elevated rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent" 
              style={{ width: `${String(row.progressoPercentagem || 0)}%` }}
            />
          </div>
          <span className="text-xs font-medium">{row.progressoPercentagem || 0}%</span>
        </div>
      ),
    },
    {
      header: 'Última Actividade',
      accessor: (row) => row.updatedAt 
        ? format(new Date(row.updatedAt), "d 'de' MMM, HH:mm", { locale: pt })
        : 'N/A',
    },
    {
      header: 'Estado',
      accessor: (row) => (
        <Badge variant={row.concluido ? 'success' : 'info'}>
          {row.concluido ? 'Concluído' : 'Em curso'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-sora">Estudantes Inscritos</h1>
      <Table 
        columns={columns} 
        data={inscricoes} 
        emptyMessage="Nenhum estudante inscrito ainda."
      />
    </div>
  );
}
