import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Avatar, Badge, Button, Card, EmptyState, Spinner, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { catalogoApi } from '@/lib/api/catalogo';
import { http } from '@/lib/api/http';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useToast } from '@/hooks/useToast';
import { ArrowUpRight, Search, ShieldCheck, UserCheck, UserPlus, Users } from 'lucide-react';
import type { PerfilPublicoBasico, VinculoComPerfil } from '@pdc/shared';

type CatalogoPessoa = PerfilPublicoBasico & { area?: string };
type VinculoPerfil = VinculoComPerfil['solicitante'] & { userId?: string };
type VinculoComPerfilUser = Omit<VinculoComPerfil, 'solicitante' | 'destinatario'> & {
  solicitante: VinculoPerfil;
  destinatario: VinculoPerfil;
};

const EMPTY_PESSOAS: CatalogoPessoa[] = [];
const EMPTY_VINCULOS: VinculoComPerfilUser[] = [];

function isVinculoNotification(value: unknown): value is { tipo: string; mensagem: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tipo' in value &&
    typeof value.tipo === 'string' &&
    'mensagem' in value &&
    typeof value.mensagem === 'string'
  );
}

function initials(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'P';
}

function resolveOutro(vinculo: VinculoComPerfilUser, userId: string | undefined, perfilId: string | null | undefined): VinculoPerfil {
  const solicitanteIsMe = vinculo.solicitante.userId === userId || vinculo.solicitante.id === perfilId;
  return solicitanteIsMe ? vinculo.destinatario : vinculo.solicitante;
}

export default function VinculosPage(): React.JSX.Element {
  const { user } = useAuth();
  const [tabActiva, setTabActiva] = useState('pessoas');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { track } = useTelemetry();

  useSocket((notif) => {
    if (!isVinculoNotification(notif)) return;
    if (notif.tipo === 'vinculo_pedido') {
      void queryClient.invalidateQueries({ queryKey: ['vinculos', 'pendentes'] });
      toast({ title: 'Novo pedido de vínculo', description: notif.mensagem });
    }
  });

  useEffect(() => {
    track('vinculos.page_view');
  }, [track]);

  const pessoasQuery = useQuery({
    queryKey: ['catalogo', 'pessoas', 'estudante', search],
    queryFn: () => catalogoApi.getPessoas({
      role: 'estudante',
      ...(search.trim() ? { search: search.trim() } : {}),
      pageSize: 12,
    }),
    staleTime: 30_000,
  });

  const pendentesQuery = useQuery({
    queryKey: ['vinculos', 'pendentes'],
    queryFn: () => http.get<{ data: VinculoComPerfilUser[] }>('/vinculos/pendentes'),
  });

  const vinculosQuery = useQuery({
    queryKey: ['vinculos', 'list'],
    queryFn: () => http.get<{ data: VinculoComPerfilUser[] }>('/vinculos'),
  });

  const pedirMutation = useMutation({
    mutationFn: (perfilId: string) => http.post(`/vinculos/${perfilId}/pedir`, {}),
    onSuccess: () => {
      toast({ title: 'Pedido de vínculo enviado' });
      void queryClient.invalidateQueries({ queryKey: ['vinculos'] });
    },
    onError: (err) => {
      console.error('pedirMutation error', err);
      toast({ title: 'Erro ao enviar pedido de vínculo', variant: 'error' });
    },
  });

  const resolverMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'aprovado' | 'rejeitado' }) =>
      http.patch(`/vinculos/${id}/resolver`, { status }),
    onSuccess: (_, variables) => {
      toast({ title: variables.status === 'aprovado' ? 'Vínculo aceite' : 'Vínculo rejeitado' });
      void queryClient.invalidateQueries({ queryKey: ['vinculos'] });
    },
    onError: (err) => {
      console.error('resolverMutation error', err);
      toast({ title: 'Erro ao processar pedido de vínculo', variant: 'error' });
    },
  });

  const pessoas = pessoasQuery.data?.data ?? EMPTY_PESSOAS;
  const pendentes = pendentesQuery.data?.data ?? EMPTY_VINCULOS;
  const vinculos = vinculosQuery.data?.data ?? EMPTY_VINCULOS;
  const connectedPerfilIds = useMemo(() => {
    const ids = new Set<string>();
    for (const vinculo of vinculos) {
      const outro = resolveOutro(vinculo, user?.id, user?.perfilId);
      ids.add(outro.id);
    }
    return ids;
  }, [user?.id, user?.perfilId, vinculos]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-20 animate-in fade-in duration-700">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="info" className="mb-3 px-3 py-1 text-[9px] font-black uppercase tracking-widest">
            Rede PDC
          </Badge>
          <h1 className="font-display text-3xl font-black tracking-tight text-ink-primary sm:text-4xl">
            Rede e Vínculos
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
            Descobre estudantes, gere pedidos e acompanha conexões formais validadas dentro do ecossistema.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-2xl border border-ink-tertiary/10 bg-elevated p-3">
          <Metric label="Estudantes" value={pessoasQuery.data?.meta.total ?? pessoas.length} />
          <Metric label="Pedidos" value={pendentes.length} />
          <Metric label="Vínculos" value={vinculos.length} />
        </div>
      </header>

      <Tabs value={tabActiva} onValueChange={setTabActiva} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="pessoas">
            Estudantes
          </TabsTrigger>
          <TabsTrigger value="pedidos">
            Pedidos {pendentes.length > 0 ? <span className="ml-2 rounded-md bg-ink-tertiary/20 px-1.5 text-[10px]">{pendentes.length}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="vinculos">
            Vínculos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pessoas" className="pt-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" size={16} />
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); }}
                placeholder="Procurar estudantes"
                className="min-h-[44px] w-full rounded-xl border border-ink-tertiary/10 bg-elevated pl-10 pr-4 text-sm text-ink-primary outline-none transition-all placeholder:text-ink-tertiary focus:border-[var(--chrome-active)] focus:ring-4 focus:ring-[var(--chrome-active-soft)]"
              />
            </div>
          </div>

          {pessoasQuery.isLoading ? (
            <CenteredSpinner />
          ) : pessoas.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum estudante encontrado"
              description="Ajusta a pesquisa ou volta mais tarde quando houver perfis públicos disponíveis."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pessoas.map((pessoa) => (
                <PessoaCard
                  key={pessoa.id}
                  pessoa={pessoa}
                  isSelf={pessoa.id === user?.perfilId}
                  isConnected={connectedPerfilIds.has(pessoa.id)}
                  isPending={pedirMutation.isPending && pedirMutation.variables === pessoa.id}
                  onPedir={() => { pedirMutation.mutate(pessoa.id); }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pedidos" className="pt-6">
          {pendentesQuery.isLoading ? (
            <CenteredSpinner />
          ) : pendentes.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="Sem pedidos pendentes"
              description="Quando alguém pedir um vínculo, aparece aqui para validação."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pendentes.map((vinculo) => (
                <Card key={vinculo.id} className="space-y-5 border-ink-tertiary/10 bg-elevated p-5">
                  <PessoaHeader pessoa={vinculo.solicitante} />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => { resolverMutation.mutate({ id: String(vinculo.id), status: 'aprovado' }); }}
                      disabled={resolverMutation.isPending}
                      className="min-h-[44px] flex-1"
                    >
                      Aceitar
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => { resolverMutation.mutate({ id: String(vinculo.id), status: 'rejeitado' }); }}
                      disabled={resolverMutation.isPending}
                      className="min-h-[44px] flex-1"
                    >
                      Recusar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="vinculos" className="pt-6">
          {vinculosQuery.isLoading ? (
            <CenteredSpinner />
          ) : vinculos.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Ainda sem vínculos formais"
              description="Usa o catálogo de estudantes para iniciar conexões dentro da rede PDC."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {vinculos.map((vinculo) => {
                const outro = resolveOutro(vinculo, user?.id, user?.perfilId);
                return (
                  <Card key={vinculo.id} className="group border-ink-tertiary/10 bg-elevated p-5 transition-all hover:border-[var(--chrome-active)]">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="relative">
                        <Avatar src={outro.avatarUrl || undefined} fallback={initials(outro.nome)} className="h-20 w-20 border-2 border-ink-tertiary/10" />
                        <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl border-4 border-elevated bg-success text-white">
                          <ShieldCheck size={14} />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-ink-primary">{outro.nome}</h3>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-ink-tertiary">{outro.role}</p>
                      </div>
                      <Link to={`/app/perfil/${outro.id}`} className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-ink-tertiary/10 text-[10px] font-black uppercase tracking-wide text-ink-secondary transition-colors hover:text-[var(--chrome-active)]">
                        Ver perfil <ArrowUpRight size={12} className="ml-2" />
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-xl bg-recessed px-4 py-3 text-center">
      <div className="text-lg font-black text-ink-primary">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">{label}</div>
    </div>
  );
}

function CenteredSpinner() {
  return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
}

function PessoaHeader({ pessoa }: { pessoa: Pick<CatalogoPessoa, 'nome' | 'avatarUrl' | 'role' | 'headline' | 'bio'> }) {
  return (
    <div className="flex items-center gap-4">
      <Avatar src={pessoa.avatarUrl || undefined} fallback={initials(pessoa.nome)} className="h-14 w-14 border border-ink-tertiary/10" />
      <div className="min-w-0">
        <h3 className="truncate text-sm font-bold text-ink-primary">{pessoa.nome}</h3>
        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-ink-tertiary">{pessoa.role}</p>
        {pessoa.headline || pessoa.bio ? <p className="mt-1 line-clamp-1 text-xs text-ink-secondary">{pessoa.headline ?? pessoa.bio}</p> : null}
      </div>
    </div>
  );
}

function PessoaCard({
  pessoa,
  isSelf,
  isConnected,
  isPending,
  onPedir,
}: {
  pessoa: CatalogoPessoa;
  isSelf: boolean;
  isConnected: boolean;
  isPending: boolean;
  onPedir: () => void;
}) {
  return (
    <Card className="flex min-h-56 flex-col justify-between border-ink-tertiary/10 bg-elevated p-5 transition-all hover:border-[var(--chrome-active)]">
      <div className="space-y-4">
        <PessoaHeader pessoa={pessoa} />
        <div className="flex flex-wrap gap-2">
          {pessoa.area ? <Badge variant="outline" className="text-[10px]">{pessoa.area}</Badge> : null}
          <Badge variant="info" className="text-[10px]">{pessoa.reputacaoTier}</Badge>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <Link to={`/app/perfil/${pessoa.id}`} className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-ink-tertiary/10 text-xs font-bold text-ink-secondary transition-colors hover:text-[var(--chrome-active)]">
          Perfil
        </Link>
        <Button
          size="sm"
          disabled={isSelf || isConnected || isPending}
          onClick={onPedir}
          className="min-h-[44px] flex-1"
        >
          {isSelf ? 'Tu' : isConnected ? 'Vinculado' : isPending ? 'A enviar' : <><UserCheck size={14} /> Vincular</>}
        </Button>
      </div>
    </Card>
  );
}
