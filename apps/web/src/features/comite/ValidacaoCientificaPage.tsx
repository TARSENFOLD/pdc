import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comiteApi } from '@/lib/api/comite';
import { Badge, Button, ListRowSkeleton } from '@/components/ui';
import { useToast } from '@/hooks/useToast';

interface ItemFila {
  id: string;
  titulo?: string;
  autorNome?: string;
  submittedAt?: string;
  tipo: string;
}

type TabTipo = 'simulacao' | 'experiencia';

export function ValidacaoCientificaPage() {
  const [tab, setTab] = useState<TabTipo>('simulacao');
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<ItemFila | null>(null);
  const [parecer, setParecer] = useState('');
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['comite', 'fila', tab, page],
    queryFn: () => comiteApi.getFila(tab, page),
  });

  const validarMutation = useMutation({
    mutationFn: ({ acao }: { acao: 'aprovar' | 'rejeitar' }) =>
      comiteApi.validar(selectedItem?.tipo ?? tab, selectedItem?.id ?? '', { acao, parecer }),
    onSuccess: (_, { acao }) => {
      toast({
        title: acao === 'aprovar' ? 'Conteúdo aprovado' : 'Conteúdo rejeitado',
        description: `O parecer foi registado e o autor foi notificado.`,
      });
      void qc.invalidateQueries({ queryKey: ['comite', 'fila'] });
      setSelectedItem(null);
      setParecer('');
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível registar o parecer.' });
    },
  });

  const itens = data?.data ?? [];
  const parecerValido = parecer.trim().length >= 20;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary font-display">Validação Científica</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-surface-raised p-1 w-fit">
        {(['simulacao', 'experiencia'] as TabTipo[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); setSelectedItem(null); }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? 'bg-amber text-black' : 'text-text-secondary hover:text-white'}`}
          >
            {t === 'simulacao' ? 'Simulações' : 'Experiências'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lista */}
        <div className="space-y-2">
          {isLoading ? (
            <ListRowSkeleton />
          ) : itens.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
              <p className="text-text-secondary">Nenhum conteúdo aguarda validação científica.</p>
            </div>
          ) : (
            itens.map((item) => (
              <button
                key={item.id}
                onClick={() => { setSelectedItem(item); setParecer(''); }}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${selectedItem?.id === item.id ? 'border-amber/40 bg-amber/5' : 'border-border bg-surface-raised hover:border-border'}`}
              >
                <p className="text-sm font-medium text-text-primary">{item.titulo ?? 'Sem título'}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-text-muted">{item.autorNome ?? 'Autor desconhecido'}</span>
                  <Badge variant="warning" className="text-[10px]">Em revisão</Badge>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Painel de validação */}
        {selectedItem ? (
          <div className="rounded-2xl border border-border bg-surface-raised p-6 space-y-4">
            <h2 className="font-semibold text-text-primary">{selectedItem.titulo}</h2>
            <p className="text-xs text-text-muted">Autor: {selectedItem.autorNome}</p>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Parecer científico <span className="text-text-muted">(mínimo 20 caracteres)</span>
              </label>
              <textarea
                value={parecer}
                onChange={(e) => { setParecer(e.target.value); }}
                rows={5}
                placeholder="Descreve a fundamentação académica da tua decisão..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber resize-none"
              />
              <p className="mt-1 text-xs text-text-muted">{parecer.trim().length}/20 caracteres mínimos</p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={() => { validarMutation.mutate({ acao: 'aprovar' }); }}
                isLoading={validarMutation.isPending}
                disabled={!parecerValido}
                className="flex-1"
              >
                Aprovar
              </Button>
              <Button
                variant="danger"
                onClick={() => { validarMutation.mutate({ acao: 'rejeitar' }); }}
                isLoading={validarMutation.isPending}
                disabled={!parecerValido}
                className="flex-1"
              >
                Rejeitar
              </Button>
            </div>

            <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(null); setParecer(''); }}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center flex items-center justify-center">
            <p className="text-text-muted text-sm">Selecciona um item para validar</p>
          </div>
        )}
      </div>
    </div>
  );
}
