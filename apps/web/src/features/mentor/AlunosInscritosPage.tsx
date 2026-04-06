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
  aluno?: {
    nome: string;
    email: string;
  };
  curso?: {
    titulo: string;
  };
}

export function AlunosInscritosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['mentor', 'alunos', 'inscritos'],
    queryFn: () => mentoriasApi.getAlunosInscritos(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold font-sora">Alunos Inscritos</h1>
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
      header: 'Nome do Aluno',
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-text-primary">{row.aluno?.nome || 'N/A'}</span>
          <span className="text-xs text-text-muted">{row.aluno?.email || ''}</span>
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
          <div className="w-24 h-2 bg-surface-raised rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber" 
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
      <h1 className="text-2xl font-bold font-sora">Alunos Inscritos</h1>
      <Table 
        columns={columns} 
        data={inscricoes} 
        emptyMessage="Nenhum aluno inscrito ainda."
      />
    </div>
  );
}
