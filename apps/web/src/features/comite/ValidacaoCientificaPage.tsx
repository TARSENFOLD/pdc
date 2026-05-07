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
      <h1 className="text-2xl font-bold text-ink-primary font-display">Validação Científica</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-ink-tertiary/10 bg-elevated p-1 w-fit">
        {(['simulacao', 'experiencia'] as TabTipo[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); setSelectedItem(null); }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? 'bg-accent text-black' : 'text-ink-secondary hover:text-white'}`}
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
            <div className="rounded-2xl border border-ink-tertiary/10 bg-elevated p-8 text-center">
              <p className="text-ink-secondary">Nenhum conteúdo aguarda validação científica.</p>
            </div>
          ) : (
            itens.map((item) => (
              <button
                key={item.id}
                onClick={() => { setSelectedItem(item); setParecer(''); }}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${selectedItem?.id === item.id ? 'border-accent/40 bg-accent/5' : 'border-ink-tertiary/10 bg-elevated hover:border-ink-tertiary/10'}`}
              >
                <p className="text-sm font-medium text-ink-primary">{item.titulo ?? 'Sem título'}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-ink-tertiary">{item.autorNome ?? 'Autor desconhecido'}</span>
                  <Badge variant="warning" className="text-[10px]">Em revisão</Badge>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Painel de validação */}
        {selectedItem ? (
          <div className="rounded-2xl border border-ink-tertiary/10 bg-elevated p-6 space-y-4">
            <h2 className="font-semibold text-ink-primary">{selectedItem.titulo}</h2>
            <p className="text-xs text-ink-tertiary">Autor: {selectedItem.autorNome}</p>

            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-2">
                Parecer científico <span className="text-ink-tertiary">(mínimo 20 caracteres)</span>
              </label>
              <textarea
                value={parecer}
                onChange={(e) => { setParecer(e.target.value); }}
                rows={5}
                placeholder="Descreve a fundamentação académica da tua decisão..."
                className="w-full rounded-md border border-ink-tertiary/10 bg-canvas px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
              <p className="mt-1 text-xs text-ink-tertiary">{parecer.trim().length}/20 caracteres mínimos</p>
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
          <div className="rounded-2xl border border-ink-tertiary/10 bg-elevated p-8 text-center flex items-center justify-center">
            <p className="text-ink-tertiary text-sm">Selecciona um item para validar</p>
          </div>
        )}
      </div>
    </div>
  );
}
