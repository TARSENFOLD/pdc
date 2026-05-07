import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '../../lib/api/http';
import { Button, Card, Badge, Input } from '../../components/ui';

interface Flag {
  id: number;
  documentId?: string;
  domain: string;
  enabled: boolean;
  description: string | null;
  overrides?: unknown;
}

type FeatureFlagsResponse = Flag[] | { data: Flag[] };
type FlagOverride = { instituicaoId: number; enabled: boolean };

function isFlagOverride(value: unknown): value is FlagOverride {
  return (
    typeof value === 'object' &&
    value !== null &&
    'instituicaoId' in value &&
    typeof value.instituicaoId === 'number' &&
    'enabled' in value &&
    typeof value.enabled === 'boolean'
  );
}

export function FeatureFlagsPage() {
  const qc = useQueryClient();
  const [newOverride, setNewOverride] = useState<{ domain: string; instId: string } | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: () => http.get<FeatureFlagsResponse>('/feature-flags'),
  });
  const flags = Array.isArray(data) ? data : data?.data ?? [];

  const toggleMutation = useMutation({
    mutationFn: ({ domain, enabled }: { domain: string; enabled: boolean }) =>
      http.put(`/feature-flags/defaults/${domain}`, { enabled }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin-feature-flags'] }); },
  });

  const addOverrideMutation = useMutation({
    mutationFn: ({ domain, instituicaoId, enabled }: { domain: string; instituicaoId: number; enabled: boolean }) =>
      http.put(`/feature-flags/institutions/${instituicaoId.toString()}/${domain}`, { enabled }),
    onSuccess: () => {
      setNewOverride(null);
      void qc.invalidateQueries({ queryKey: ['admin-feature-flags'] });
    },
  });

  const removeOverrideMutation = useMutation({
    mutationFn: ({ domain, instituicaoId }: { domain: string; instituicaoId: number }) =>
      http.delete(`/feature-flags/institutions/${instituicaoId.toString()}/${domain}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin-feature-flags'] }); },
  });

  if (isLoading) return <div className="p-6">A carregar...</div>;
  if (isError) {
    const message = error instanceof Error ? error.message : 'Erro inesperado';
    return <div className="p-6 text-error">Erro ao carregar feature flags: {message}</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Feature Flags</h1>

      {flags.map((f) => {
        const overrides = Array.isArray(f.overrides) ? f.overrides.filter(isFlagOverride) : [];
        return (
        <Card key={f.id.toString()} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono font-semibold">{f.domain}</span>
              {f.description && <p className="text-sm text-muted-foreground">{f.description}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={f.enabled ? 'success' : 'default'}>
                {f.enabled ? 'ON' : 'OFF'}
              </Badge>
              <Button
                size="sm"
                variant={f.enabled ? 'danger' : 'primary'}
                onClick={() => { toggleMutation.mutate({ domain: f.domain, enabled: !f.enabled }); }}
                disabled={toggleMutation.isPending}
              >
                {f.enabled ? 'Desligar' : 'Ligar'}
              </Button>
            </div>
          </div>

          {/* Overrides */}
          <div className="border-t pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overrides por Instituição</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => { setNewOverride({ domain: f.domain, instId: '' }); }}
              >
                + Override
              </Button>
            </div>

            {overrides.length > 0 ? (
              <div className="space-y-1">
                {overrides.map((o) => (
                  <div key={o.instituicaoId.toString()} className="flex items-center gap-2 text-sm">
                    <span>Inst. #{o.instituicaoId.toString()}</span>
                    <Badge variant={o.enabled ? 'success' : 'default'} className="text-xs">
                      {o.enabled ? 'ON' : 'OFF'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        addOverrideMutation.mutate({
                          domain: f.domain,
                          instituicaoId: o.instituicaoId,
                          enabled: !o.enabled,
                        });
                      }}
                    >
                      Toggle
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500"
                      onClick={() => {
                        removeOverrideMutation.mutate({
                          domain: f.domain,
                          instituicaoId: o.instituicaoId,
                        });
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sem overrides</p>
            )}

            {newOverride?.domain === f.domain && (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  placeholder="ID da instituição"
                  value={newOverride.instId}
                  onChange={(e) => { setNewOverride({ ...newOverride, instId: e.target.value }); }}
                  className="w-40"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const id = parseInt(newOverride.instId);
                    if (id > 0) {
                      addOverrideMutation.mutate({ domain: f.domain, instituicaoId: id, enabled: true });
                    }
                  }}
                  disabled={!newOverride.instId || addOverrideMutation.isPending}
                >
                  Adicionar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setNewOverride(null); }}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </Card>
        );
      })}
    </div>
  );
}
