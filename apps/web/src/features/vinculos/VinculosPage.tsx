import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Spinner, Tabs, TabsList, TabsTrigger, TabsContent, Button, Avatar, Card, Badge, EmptyState } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/lib/auth/AuthContext';
import { http } from '@/lib/api/http';
import { Users, UserPlus, ShieldCheck, ArrowUpRight, Filter, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { VinculoComPerfil } from '@pdc/shared';

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

export function VinculosPage() {
  const { user } = useAuth();
  const [tabActiva, setTabActiva] = useState('pedidos');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { track } = useTelemetry();

  useSocket((notif) => {
    if (!isVinculoNotification(notif)) return;
    if (notif.tipo === 'vinculo_pedido') {
      void queryClient.invalidateQueries({ queryKey: ['vinculos', 'pendentes'] });
      toast({ title: 'Novo Pedido de Vínculo', description: notif.mensagem });
    }
  });

  useEffect(() => {
    track('simulacao.iniciada'); // Placeholder para teste de track
  }, [track]);

  const { data: pendentes, isLoading: loadingPendentes } = useQuery({
    queryKey: ['vinculos', 'pendentes'],
    queryFn: () => http.get<{ data: VinculoComPerfil[] }>('/vinculos/pendentes'),
    enabled: tabActiva === 'pedidos',
  });

  const { data: active, isLoading: loadingActive } = useQuery({
    queryKey: ['vinculos', 'list'],
    queryFn: () => http.get<{ data: VinculoComPerfil[] }>('/vinculos'),
    enabled: tabActiva === 'conexoes',
  });

  const resolverMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'aprovado' | 'rejeitado' }) =>
      http.patch(`/vinculos/${id}/resolver`, { status }),
    onSuccess: (_, variables) => {
      toast({ title: variables.status === 'aprovado' ? 'Vínculo Aceite' : 'Vínculo Rejeitado' });
      void queryClient.invalidateQueries({ queryKey: ['vinculos'] });
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-20 animate-in fade-in duration-1000">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Badge variant="info" className="bg-accent/10 text-accent border-accent/20 mb-3 px-3 py-1 uppercase tracking-widest text-[9px] font-black">Social Network</Badge>
          <h1 className="text-4xl font-black text-ink-primary tracking-tighter font-display">
            A Minha <span className="text-accent">Rede</span>
          </h1>
          <p className="text-ink-secondary mt-2 max-w-lg leading-relaxed text-sm">
            Conexões de elite validadas por mérito e autoridade técnica.
          </p>
        </div>
        <div className="flex gap-2">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" size={16} />
             <input placeholder="Procurar na rede..." className="bg-recessed border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm focus:border-accent/40 outline-none w-64" />
           </div>
           <Button variant="secondary" size="md" className="bg-recessed border-white/5 px-3"><Filter size={18} /></Button>
        </div>
      </header>

      <Tabs defaultValue="pedidos" onValueChange={setTabActiva} className="w-full">
        <TabsList className="bg-recessed p-1 rounded-2xl border border-white/5 w-fit">
          <TabsTrigger value="pedidos" className="rounded-xl px-8 py-2.5 font-bold data-[state=active]:bg-accent data-[state=active]:text-white transition-all">
            Pedidos {pendentes?.data && pendentes.data.length > 0 && <span className="ml-2 bg-white/20 px-1.5 rounded-md text-[10px]">{pendentes.data.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="conexoes" className="rounded-xl px-8 py-2.5 font-bold data-[state=active]:bg-accent data-[state=active]:text-white transition-all">Conexões</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="pt-8">
          {loadingPendentes ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : (pendentes?.data ?? []).length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="Sinal Silencioso"
              description="Não tens pedidos de conexão pendentes."
              ctaLabel="Ver Mentores"
              ctaTo="/app/explorar"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {pendentes?.data.map((v, idx) => (
                  <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                    <Card className="p-6 bg-elevated border-white/5 rounded-[32px] space-y-6 shadow-xl">
                      <div className="flex items-center gap-4">
                        <Avatar src={v.solicitante.avatarUrl || undefined} fallback={v.solicitante.nome[0]} className="h-14 w-14 border-2 border-accent/20" />
                        <div>
                          <h4 className="font-bold text-ink-primary tracking-tight">{v.solicitante.nome}</h4>
                          <Badge variant="outline" className="text-[8px] uppercase border-white/10 text-ink-tertiary mt-1">{v.solicitante.role}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => { resolverMutation.mutate({ id: String(v.id), status: 'aprovado' }); }}
                          disabled={resolverMutation.isPending}
                          className="flex-1 bg-accent text-white font-bold rounded-xl h-11"
                        >Aceitar</Button>
                        <Button 
                          variant="ghost"
                          onClick={() => { resolverMutation.mutate({ id: String(v.id), status: 'rejeitado' }); }}
                          className="flex-1 border border-white/5 rounded-xl h-11"
                        >Recusar</Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="conexoes" className="pt-8">
          {loadingActive ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : (active?.data ?? []).length === 0 ? (
            <EmptyState
              icon={Users}
              title="Rede Isolada"
              description="Ainda não estabeleceste vínculos formais."
              ctaLabel="Explorar"
              ctaTo="/app/explorar"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {active?.data.map((v) => {
                const outro = v.solicitante.id === user?.id ? v.destinatario : v.solicitante;
                return (
                  <Card key={v.id} className="p-6 bg-elevated border-white/5 rounded-[32px] group hover:border-accent/30 transition-all">
                    <div className="flex flex-col items-center text-center space-y-4">
                       <div className="relative">
                          <Avatar src={outro.avatarUrl || undefined} fallback={outro.nome[0]} className="h-20 w-24 rounded-[24px] border-2 border-white/5 group-hover:border-accent/20 transition-all" />
                          <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-xl bg-success border-4 border-surface flex items-center justify-center text-white shadow-lg">
                             <ShieldCheck size={14} />
                          </div>
                       </div>
                       <div>
                          <h4 className="font-bold text-ink-primary truncate w-full">{outro.nome}</h4>
                          <p className="text-[10px] text-ink-tertiary uppercase font-black tracking-widest mt-1">{outro.role}</p>
                       </div>
                       <Button variant="ghost" size="sm" className="w-full border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                          Enviar Mensagem <ArrowUpRight size={12} className="ml-2 text-accent" />
                       </Button>
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
