import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { propostasApi, estudantesVinculadosApi } from '@/lib/api/propostas';
import { Card, Button, Table, Spinner, Avatar, Modal, type Column } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import type { PerfilCompleto, PropostaTipo } from '@pdc/shared';

export function EstudantesVinculadosPage() {
  const [selectedStudent, setSelectedStudent] = useState<PerfilCompleto | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [tipo, setTipo] = useState<PropostaTipo>('experiencia');
  
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['estudantes', 'vinculados'],
    queryFn: () => estudantesVinculadosApi.list(),
  });

  const mutation = useMutation({
    mutationFn: () => propostasApi.criar({
      estudanteId: selectedStudent?.id ?? '',
      mensagem,
      tipo,
    }),
    onSuccess: () => {
      toast({ title: 'Proposta enviada!' });
      setSelectedStudent(null);
      setMensagem('');
      queryClient.invalidateQueries({ queryKey: ['propostas'] });
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
      accessor: (aluno: PerfilCompleto) => (
        <div className="flex items-center gap-3">
          <Avatar src={aluno.avatarUrl as string} fallback={aluno.nome?.[0] || 'E'} />
          <div>
            <div className="font-medium">{aluno.nome}</div>
            <div className="text-xs text-muted-foreground">{aluno.email}</div>
          </div>
        </div>
      )
    },
    { header: 'Área de Interesse', accessor: (aluno: PerfilCompleto) => ('areaInteresse' in aluno ? String((aluno as Record<string, unknown>).areaInteresse) : 'N/A') },
    { 
      header: 'Ações', 
      accessor: (aluno: PerfilCompleto) => (
        <Button size="sm" onClick={() => { setSelectedStudent(aluno); }}>
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
        onOpenChange={(open: boolean) => !open && setSelectedStudent(null)}
      >
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold">Nova Proposta para {selectedStudent?.nome}</h2>
          
          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo de Proposta</label>
            <select 
              className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background"
              value={tipo}
              onChange={(e) => { setTipo(e.target.value as PropostaTipo); }}
            >
              <option value="experiencia">Experiência</option>
              <option value="programa">Programa</option>
              <option value="bolsa">Bolsa de Estudo</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Mensagem Personalizada</label>
            <textarea 
              className="flex min-h-[120px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
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
