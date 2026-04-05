import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Spinner, Tabs, TabsList, TabsTrigger, TabsContent, Button, Avatar, Card, ConectarButton } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { http } from '@/lib/api/http';
import type { VinculoTipo, PerfilPublicoBasico } from '@pdc/shared';

interface VinculoComPerfil {
  id: string;
  estado: string;
  connectionType: VinculoTipo;
  senderPerfil: PerfilPublicoBasico;
  receiverPerfil: PerfilPublicoBasico;
}

interface VinculosResponse {
  data: VinculoComPerfil[];
  meta?: { pagination?: { total: number } };
}

interface SugestoesResponse {
  data: PerfilPublicoBasico[];
}

export function VinculosPage() {
  const [tabActiva, setTabActiva] = useState('pedidos');
  const [tipoFiltro, setTipoFiltro] = useState<VinculoTipo | undefined>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Pedidos Recebidos
  const { data: pendentes, isLoading: loadingPendentes } = useQuery({
    queryKey: ['vinculos', 'pendentes'],
    queryFn: () => http.get<VinculosResponse>('/vinculos/pendentes'),
    enabled: tabActiva === 'pedidos',
  });

  // Os Meus Vinculos
  const { data: meus, isLoading: loadingMeus } = useQuery({
    queryKey: ['vinculos', 'meus', tipoFiltro],
    queryFn: () => {
      const params = new URLSearchParams();
      if (tipoFiltro) params.append('tipo', tipoFiltro);
      return http.get<VinculosResponse>(`/vinculos/meus?${params.toString()}`);
    },
    enabled: tabActiva === 'meus',
  });

  // Sugestoes
  const { data: sugestoes, isLoading: loadingSugestoes } = useQuery({
    queryKey: ['vinculos', 'sugestoes'],
    queryFn: () => http.get<SugestoesResponse>('/vinculos/sugestoes'),
    enabled: tabActiva === 'sugestoes',
  });

  const aceitarRejeitar = useMutation({
    mutationFn: ({ vinculoId, acao }: { vinculoId: string; acao: 'aceitar' | 'rejeitar' }) =>
      http.patch<{ success: boolean }>(`/vinculos/${vinculoId}`, { acao }),
    onSuccess: (_, { acao }) => {
      toast({
        title: 'Sucesso',
        description: acao === 'aceitar' ? 'Vinculo aceite!' : 'Vinculo rejeitado.',
      });
      void queryClient.invalidateQueries({ queryKey: ['vinculos'] });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Operacao falhou.' });
    },
  });

  // Agrupar vinculos por tipo
  const meusPorTipo = (meus?.data ?? []).reduce<Record<string, VinculoComPerfil[]>>((acc, v) => {
    const key = v.connectionType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Vinculos</h1>

      <Tabs defaultValue="pedidos" onValueChange={setTabActiva}>
        <TabsList>
          <TabsTrigger value="pedidos">Pedidos Recebidos</TabsTrigger>
          <TabsTrigger value="meus">Os Meus Vinculos</TabsTrigger>
          <TabsTrigger value="sugestoes">Sugestoes</TabsTrigger>
        </TabsList>

        {/* Pedidos Recebidos */}
        <TabsContent value="pedidos">
          {loadingPendentes ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : (pendentes?.data ?? []).length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              Nenhum pedido de vinculo pendente.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(pendentes?.data ?? []).map((v) => (
                <Card key={v.id} className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar
                      {...(v.senderPerfil.avatarUrl ? { src: v.senderPerfil.avatarUrl } : {})}
                      fallback={v.senderPerfil.nome.substring(0, 2).toUpperCase()}
                      size="md"
                    />
                    <div>
                      <p className="font-medium text-text-primary">{v.senderPerfil.nome}</p>
                      <p className="text-xs text-text-secondary capitalize">{v.senderPerfil.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => { aceitarRejeitar.mutate({ vinculoId: v.id, acao: 'aceitar' }); }}
                      disabled={aceitarRejeitar.isPending}
                      className="flex-1"
                    >
                      Aceitar
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => { aceitarRejeitar.mutate({ vinculoId: v.id, acao: 'rejeitar' }); }}
                      disabled={aceitarRejeitar.isPending}
                      className="flex-1"
                    >
                      Rejeitar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Os Meus Vinculos */}
        <TabsContent value="meus">
          <div className="mb-4 flex gap-2">
            <Button
              variant={!tipoFiltro ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => { setTipoFiltro(undefined); }}
            >
              Todos
            </Button>
            {(['student-student', 'student-mentor', 'student-institution', 'mentor-institution'] as VinculoTipo[]).map(
              (tipo) => (
                <Button
                  key={tipo}
                  variant={tipoFiltro === tipo ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => { setTipoFiltro(tipo); }}
                >
                  {tipo.replace('-', ' ').toUpperCase()}
                </Button>
              )
            )}
          </div>

          {loadingMeus ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : (meus?.data ?? []).length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              Nenhum vinculo confirmado.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(meusPorTipo).map(([tipo, vinculos]) => (
                <div key={tipo}>
                  <h3 className="text-lg font-semibold text-text-primary mb-3 capitalize">{tipo}</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {vinculos.map((v) => (
                      <Card key={v.id} className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            {...(v.senderPerfil.avatarUrl !== undefined
                              ? { src: v.senderPerfil.avatarUrl }
                              : v.receiverPerfil.avatarUrl !== undefined
                                ? { src: v.receiverPerfil.avatarUrl }
                                : {})}
                            fallback={(v.senderPerfil.nome || v.receiverPerfil.nome).substring(0, 2).toUpperCase()}
                            size="md"
                          />
                          <div>
                            <p className="font-medium text-text-primary">
                              {v.senderPerfil.nome || v.receiverPerfil.nome}
                            </p>
                            <p className="text-xs text-text-secondary">Conectado</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sugestoes */}
        <TabsContent value="sugestoes">
          {loadingSugestoes ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : (sugestoes?.data ?? []).length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              Nenhuma sugestao de vinculo no momento.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(sugestoes?.data ?? []).map((perfil) => (
                <Card key={perfil.id} className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar
                      {...(perfil.avatarUrl ? { src: perfil.avatarUrl } : {})}
                      fallback={perfil.nome.substring(0, 2).toUpperCase()}
                      size="md"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">{perfil.nome}</p>
                      <p className="text-xs text-text-secondary capitalize">{perfil.role}</p>
                      {perfil.bio && <p className="text-xs text-text-secondary mt-1 line-clamp-2">{perfil.bio}</p>}
                    </div>
                  </div>
                  <ConectarButton
                    targetId={perfil.id}
                    connectionType="student-mentor"
                    onConnected={() => void queryClient.invalidateQueries({ queryKey: ['vinculos'] })}
                  />
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
