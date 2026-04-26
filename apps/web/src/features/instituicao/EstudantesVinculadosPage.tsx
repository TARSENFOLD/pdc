import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { propostasApi, estudantesVinculadosApi } from '@/lib/api/propostas';
import { Card, Button, Table, Spinner, Avatar, Modal, type Column } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import type { PerfilCompleto, PropostaTipo } from '@pdc/shared';

export function EstudantesVinculadosPage() {
  const [selectedStudent, setSelectedStudent] = useState<PerfilCompleto | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<PropostaTipo>('estagio');
  
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['estudantes', 'vinculados'],
    queryFn: () => estudantesVinculadosApi.list(),
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedStudent?.id) return Promise.reject(new Error('Estudante não selecionado'));
      return propostasApi.criar({
        targetId: selectedStudent.id,
        titulo: titulo || `Proposta de ${tipo}`,
        tipo,
        mensagem,
      });
    },
    onSuccess: () => {
      toast({ title: 'Proposta enviada!' });
      setSelectedStudent(null);
      setMensagem('');
      void queryClient.invalidateQueries({ queryKey: ['propostas'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar proposta';
      toast({ title: 'Erro', description: msg, variant: 'error' });
    }
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;

  const estudantes = data?.data ?? [];

  const columns: Column<PerfilCompleto>[] = [
    { 
      header: 'Estudante', 
      accessor: (estudante: PerfilCompleto) => (
        <div className="flex items-center gap-3">
          <Avatar src={estudante.avatarUrl || undefined} fallback={estudante.nome[0] || 'E'} />
          <div>
            <div className="font-medium">{estudante.nome}</div>
            <div className="text-xs text-muted-foreground">{estudante.email}</div>
          </div>
        </div>
      )
    },
    { header: 'Área de Interesse', accessor: (estudante: PerfilCompleto) => estudante.areasInteresse[0] || 'N/A' },
    { 
      header: 'Ações', 
      accessor: (estudante: PerfilCompleto) => (
        <Button size="sm" onClick={() => { setSelectedStudent(estudante); }}>
          Enviar Proposta
        </Button>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Estudantes Vinculados</h1>
      </div>

      <Card>
        {estudantes.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center">
            <p className="text-muted-foreground">Ainda não tem estudantes vinculados à sua instituição.</p>
          </div>
        ) : (
          <Table columns={columns} data={estudantes} />
        )}
      </Card>

      <Modal 
        open={!!selectedStudent} 
        onOpenChange={(open: boolean) => { if (!open) setSelectedStudent(null); }}
      >
        <div className="space-y-4 pt-4 text-ink-primary">
          <h2 className="text-xl font-bold">Nova Proposta para {selectedStudent?.nome}</h2>
          
          <div className="space-y-1">
            <label className="text-sm font-medium">Título da Proposta</label>
            <input 
              className="flex h-10 w-full rounded-md border border-ink-tertiary/10 bg-canvas px-3 py-2 text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              placeholder="Ex: Convite para Estágio de Verão"
              value={titulo}
              onChange={(e) => { setTitulo(e.target.value); }}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo de Proposta</label>
            <select 
              className="flex h-10 w-full rounded-md border border-ink-tertiary/10 bg-canvas px-3 py-2 text-sm text-ink-primary ring-offset-background focus:ring-accent"
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
            <label className="text-sm font-medium">Mensagem Personalizada</label>
            <textarea 
              className="flex min-h-[120px] w-full rounded-md border border-ink-tertiary/10 bg-canvas px-3 py-2 text-sm text-ink-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              placeholder="Explique por que este estudante é um bom match..."
              value={mensagem}
              onChange={(e) => { setMensagem(e.target.value); }}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => { setSelectedStudent(null); }}>Cancelar</Button>
            <Button 
              isLoading={mutation.isPending}
              disabled={mensagem.length < 10}
              onClick={() => { mutation.mutate(); }}
            >
              Enviar Proposta
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
