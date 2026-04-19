import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Spinner, Table, Tabs, TabsList, TabsTrigger, TabsContent, Button, Modal, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { http } from '@/lib/api/http';

type TipoFila = 'curso' | 'simulacao' | 'experiencia';

interface ItemFila {
  id: string;
  titulo: string;
  autorNome: string;
  submittedAt: string;
  tipo: TipoFila;
}

interface FilaResponse {
  data: ItemFila[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
}

export function FilaAprovacaoPage() {
  const [tipoAtual, setTipoAtual] = useState<TipoFila>('curso');
  const [page, setPage] = useState(1);
  const [isRejeitarOpen, setIsRejeitarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemFila | null>(null);
  const [motivo, setMotivo] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['moderacao', 'fila', tipoAtual, page],
    queryFn: () =>
      http.get<FilaResponse>(`/moderacao/fila?tipo=${tipoAtual}&page=${page.toString()}&pageSize=10`),
  });

  const aprovarMutation = useMutation({
    mutationFn: (item: ItemFila) =>
      http.put<{ success: boolean }>(`/moderacao/${item.tipo}/${item.id}/aprovar`, {}),
    onSuccess: () => {
      toast({ title: 'Aprovado', description: 'O item foi aprovado com sucesso.' });
      void queryClient.invalidateQueries({ queryKey: ['moderacao', 'fila'] });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Nao foi possivel aprovar o item.' });
    }
  });

  const rejeitarMutation = useMutation({
    mutationFn: () => {
      if (!selectedItem || motivo.length < 10) {
        throw new Error('Motivo invalido');
      }
      return http.put<{ success: boolean }>(
        `/moderacao/${selectedItem.tipo}/${selectedItem.id}/rejeitar`,
        { motivo }
      );
    },
    onSuccess: () => {
      toast({ title: 'Rejeitado', description: 'O item foi rejeitado e retornou a rascunho.' });
      void queryClient.invalidateQueries({ queryKey: ['moderacao', 'fila'] });
      setIsRejeitarOpen(false);
      setSelectedItem(null);
      setMotivo('');
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Nao foi possivel rejeitar o item.' });
    }
  });

  const columns = [
    {
      header: 'Titulo',
      accessor: (item: ItemFila) => (
        <p className="text-sm font-medium text-text-primary">{item.titulo}</p>
      ),
    },
    {
      header: 'Autor',
      accessor: (item: ItemFila) => (
        <p className="text-sm text-text-secondary">{item.autorNome}</p>
      ),
    },
    {
      header: 'Submetido em',
      accessor: (item: ItemFila) => (
        <p className="text-sm text-text-secondary">
          {new Date(item.submittedAt).toLocaleDateString('pt-PT')}
        </p>
      ),
    },
    {
      header: 'Acoes',
      accessor: (item: ItemFila) => (
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => { aprovarMutation.mutate(item); }}
            className="h-8 px-3 text-xs"
          >
            Aprovar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => { setSelectedItem(item); setIsRejeitarOpen(true); }}
            className="h-8 px-3 text-xs"
          >
            Rejeitar
          </Button>
        </div>
      ),
    },
  ];

  const tipoLabels: Record<TipoFila, string> = {
    curso: 'Cursos',
    simulacao: 'Simulacoes',
    experiencia: 'Experiencias',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Fila de Aprovacao</h1>

      <Tabs
        defaultValue="curso"
        onValueChange={(v) => {
          setTipoAtual(v as TipoFila);
          setPage(1);
        }}
      >
        <TabsList>
          {(['curso', 'simulacao', 'experiencia'] as const).map((t) => (
            <TabsTrigger key={t} value={t}>
              {tipoLabels[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tipoAtual}>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : (data?.data ?? []).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-secondary">Nada para revisar nesta categoria.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <Table columns={columns} data={data?.data ?? []} />
              {data?.pagination && data.pagination.pageCount > 1 && (
                <div className="flex justify-center gap-2">
                  {Array.from({ length: data.pagination.pageCount }).map((_, i) => (
                    <Button
                      key={(i + 1).toString()}
                      variant={page === i + 1 ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => { setPage(i + 1); }}
                    >
                      {(i + 1).toString()}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Rejeicao */}
      <Modal
        open={isRejeitarOpen}
        onOpenChange={(open) => {
          setIsRejeitarOpen(open);
          if (!open) {
            setSelectedItem(null);
            setMotivo('');
          }
        }}
      >
        <ModalHeader>
          <ModalTitle>Rejeitar {selectedItem?.titulo}</ModalTitle>
        </ModalHeader>

        <div className="py-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">
              Motivo da rejeicao (minimo 10 caracteres)
            </label>
            <textarea
              value={motivo}
              onChange={(e) => { setMotivo(e.target.value); }}
              placeholder="Explica o motivo da rejeicao..."
              maxLength={500}
              rows={4}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber resize-none"
            />
            <p className="text-xs text-text-secondary mt-2">
              {motivo.length.toString()}/500
            </p>
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => { setIsRejeitarOpen(false); }}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => { rejeitarMutation.mutate(); }}
            disabled={motivo.length < 10}
            isLoading={rejeitarMutation.isPending}
          >
            Rejeitar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
