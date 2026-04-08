import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/api/http';
import { Spinner, Table, Badge, Button, Modal, ModalHeader, ModalTitle, ModalFooter, Input } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { ToggleLeft, ToggleRight, Plus, Trash2, Building2 } from 'lucide-react';
import type { Column } from '@/components/ui/Table';

interface FlagOverride {
  instituicaoId: number;
  enabled: boolean;
}

interface FeatureFlag {
  id: number;
  domain: string;
  enabled: boolean;
  description: string | null;
  overrides: FlagOverride[] | null;
}

const flagsApi = {
  list: () => http.get<{ data: FeatureFlag[] }>('/feature-flags').then((r) => r.data),
  upsert: (domain: string, body: { enabled: boolean; description?: string }) =>
    http.put<FeatureFlag>(`/feature-flags/defaults/${domain}`, body),
  setOverride: (instId: number, domain: string, enabled: boolean) =>
    http.put<FeatureFlag>(`/feature-flags/institutions/${String(instId)}/${domain}`, { enabled }),
  removeOverride: (instId: number, domain: string) =>
    http.delete<FeatureFlag>(`/feature-flags/institutions/${String(instId)}/${domain}`),
};

export function FeatureFlagsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [overrideInstId, setOverrideInstId] = useState('');
  const [overrideEnabled, setOverrideEnabled] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: flagsApi.list,
  });

  const toggleMutation = useMutation({
    mutationFn: (flag: FeatureFlag) =>
      flagsApi.upsert(flag.domain, { enabled: !flag.enabled }),
    onSuccess: () => {
      toast({ title: 'Flag atualizada' });
      void queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível atualizar a flag.' });
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      flagsApi.upsert(newDomain.trim(), { enabled: false, description: newDescription.trim() || undefined }),
    onSuccess: () => {
      toast({ title: 'Flag criada', description: `${newDomain} adicionada.` });
      void queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      setIsCreateOpen(false);
      setNewDomain('');
      setNewDescription('');
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível criar a flag.' });
    },
  });

  const addOverrideMutation = useMutation({
    mutationFn: () => {
      if (!selectedFlag) throw new Error('No flag selected');
      return flagsApi.setOverride(Number(overrideInstId), selectedFlag.domain, overrideEnabled);
    },
    onSuccess: () => {
      toast({ title: 'Override adicionado' });
      void queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      setIsOverrideOpen(false);
      setOverrideInstId('');
      setOverrideEnabled(true);
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível adicionar o override.' });
    },
  });

  const removeOverrideMutation = useMutation({
    mutationFn: ({ instId, domain }: { instId: number; domain: string }) =>
      flagsApi.removeOverride(instId, domain),
    onSuccess: () => {
      toast({ title: 'Override removido' });
      void queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível remover o override.' });
    },
  });

  const columns: Column<FeatureFlag>[] = [
    { header: 'Domain', accessor: 'domain' },
    {
      header: 'Estado',
      accessor: (f) => (
        <button
          type="button"
          onClick={() => toggleMutation.mutate(f)}
          className="flex items-center gap-1.5"
          disabled={toggleMutation.isPending}
        >
          {f.enabled ? (
            <><ToggleRight className="h-5 w-5 text-emerald-500" /><Badge variant="success">ON</Badge></>
          ) : (
            <><ToggleLeft className="h-5 w-5 text-muted" /><Badge variant="secondary">OFF</Badge></>
          )}
        </button>
      ),
    },
    { header: 'Descrição', accessor: (f) => f.description ?? '—' },
    {
      header: 'Overrides',
      accessor: (f) => {
        const count = Array.isArray(f.overrides) ? f.overrides.length : 0;
        return (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{count}</span>
            <button
              type="button"
              onClick={() => { setSelectedFlag(f); setIsOverrideOpen(true); }}
              className="text-xs text-primary hover:underline"
            >
              Gerir
            </button>
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feature Flags</h1>
          <p className="text-sm text-muted-foreground">
            Controlo de rollout de funcionalidades por flag e por instituição.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Nova Flag
        </Button>
      </div>

      <Table columns={columns} data={flags} emptyMessage="Nenhuma feature flag configurada." />

      {/* Create Flag Modal */}
      <Modal open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <ModalHeader><ModalTitle>Nova Feature Flag</ModalTitle></ModalHeader>
        <div className="space-y-4 px-6 py-4">
          <Input
            label="Domain"
            placeholder="DISCUSSIONS_ENABLED"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
          />
          <Input
            label="Descrição"
            placeholder="Activar fóruns de discussão nos cursos"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!newDomain.trim() || createMutation.isPending}
          >
            Criar (desligada)
          </Button>
        </ModalFooter>
      </Modal>

      {/* Institution Override Modal */}
      <Modal open={isOverrideOpen} onOpenChange={setIsOverrideOpen}>
        <ModalHeader>
          <ModalTitle>
            <Building2 className="mr-2 inline h-5 w-5" />
            Overrides — {selectedFlag?.domain}
          </ModalTitle>
        </ModalHeader>
        <div className="space-y-4 px-6 py-4">
          {/* Existing overrides */}
          {selectedFlag && Array.isArray(selectedFlag.overrides) && selectedFlag.overrides.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Overrides activos</p>
              {selectedFlag.overrides.map((o) => (
                <div key={o.instituicaoId} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
                  <span>Instituição #{o.instituicaoId}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={o.enabled ? 'success' : 'secondary'}>{o.enabled ? 'ON' : 'OFF'}</Badge>
                    <button
                      type="button"
                      onClick={() => removeOverrideMutation.mutate({ instId: o.instituicaoId, domain: selectedFlag.domain })}
                      className="text-destructive hover:text-destructive/80"
                      disabled={removeOverrideMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum override configurado.</p>
          )}

          {/* Add new override */}
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Adicionar override</p>
            <div className="flex items-end gap-2">
              <Input
                label="ID da Instituição"
                type="number"
                placeholder="5"
                value={overrideInstId}
                onChange={(e) => setOverrideInstId(e.target.value)}
                className="w-32"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={overrideEnabled}
                  onChange={(e) => setOverrideEnabled(e.target.checked)}
                  className="rounded"
                />
                Ativada
              </label>
              <Button
                size="sm"
                onClick={() => addOverrideMutation.mutate()}
                disabled={!overrideInstId || addOverrideMutation.isPending}
              >
                Adicionar
              </Button>
            </div>
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsOverrideOpen(false)}>Fechar</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
