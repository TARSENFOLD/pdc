import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { propostasApi, estudantesVinculadosApi } from '@/lib/api/propostas';
import { Card, Table, Spinner, Badge, Avatar, Button, Modal, type Column } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import type { Proposta, PropostaTipo } from '@pdc/shared';

interface PropostaExibicao extends Proposta {
  estudante?: { nome: string; avatarUrl?: string };
}

export function PropostasPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<PropostaTipo>('estagio');

  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['propostas'],
    queryFn: () => propostasApi.list(),
  });

  const { data: estudantes } = useQuery({
    queryKey: ['estudantes', 'vinculados'],
    queryFn: () => estudantesVinculadosApi.list(),
  });

  const mutation = useMutation({
    mutationFn: () => propostasApi.criar({
      targetId: selectedStudentId,
      titulo: titulo || `Proposta de ${tipo}`,
      mensagem,
      tipo,
    }),
    onSuccess: () => {
      toast({ title: 'Proposta enviada!' });
      setModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['propostas'] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro ao enviar proposta';
      toast({ title: 'Erro', description: message, variant: 'error' });
    }
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  if (error) return <div className="text-red-500">Erro ao carregar propostas</div>;

  const propostas = data?.data ?? [];

  const columns: Column<Proposta>[] = [
    { 
      header: 'Estudante', 
      accessor: (prop: PropostaExibicao) => (
        <div className="flex items-center gap-3">
          <Avatar 
            src={prop.estudante?.avatarUrl} 
            fallback={prop.estudante?.nome[0] ?? 'E'} 
          />
          <div className="font-medium">{prop.estudante?.nome ?? 'Estudante'}</div>
        </div>
      )
    },
    { 
      header: 'Tipo', 
      accessor: (prop: Proposta) => (
        <Badge variant="outline">{prop.tipo.toUpperCase()}</Badge>
      )
    },
    { 
      header: 'Estado', 
      accessor: (prop: Proposta) => (
        <Badge variant={prop.status === 'aceita' ? 'success' : prop.status === 'recusada' ? 'error' : 'warning'}>
          {(prop.status ?? 'PENDENTE').toUpperCase()}
        </Badge>
      )
    },
    { header: 'Data', accessor: (prop: Proposta) => new Date(prop.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Histórico de Propostas</h1>
        <Button onClick={() => { setModalOpen(true); }}>Nova Proposta</Button>
      </div>

      <Card>
        {propostas.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center">
            <p className="text-muted-foreground">Ainda não enviou nenhuma proposta.</p>
          </div>
        ) : (
          <Table columns={columns} data={propostas} />
        )}
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Nova Proposta">
        <div className="space-y-4 pt-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Título da Proposta</label>
            <input 
              className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
              placeholder="Ex: Convite para Estágio de Verão"
              value={titulo}
              onChange={(e) => { setTitulo(e.target.value); }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Estudante</label>
            <select 
              className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
              value={selectedStudentId}
              onChange={(e) => { setSelectedStudentId(e.target.value); }}
            >
              <option value="">Selecione um estudante</option>
              {estudantes?.data.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo de Proposta</label>
            <select 
              className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
              value={tipo}
              onChange={(e) => { setTipo(e.target.value as PropostaTipo); }}
            >
              <option value="estagio">Estágio</option>
              <option value="emprego">Emprego</option>
              <option value="bolsa">Bolsa de Estudo</option>
              <option value="parceria">Parceria</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Mensagem / Descrição</label>
            <textarea 
              className="flex min-h-[100px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
              placeholder="Mensagem..."
              value={mensagem}
              onChange={(e) => { setMensagem(e.target.value); }}
            />
          </div>
          <Button 
            className="w-full"
            isLoading={mutation.isPending} 
            onClick={() => { mutation.mutate(); }} 
            disabled={!selectedStudentId || !mensagem || !titulo}
          >
            Enviar Proposta
          </Button>
        </div>
      </Modal>
    </div>
  );
}
