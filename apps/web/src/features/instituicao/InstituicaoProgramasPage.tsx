import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { programasApi } from '@/lib/api/programas';
import { Spinner, Button, Badge } from '@/components/ui';
import { EditorialStateBadge } from '@/components/ui/EditorialStateBadge';
import { GraduationCap, Plus, Pencil, Eye, Send, Megaphone } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import type { Programa } from '@pdc/shared';
import { motion } from 'motion/react';

const TIPO_LABEL: Record<string, string> = {
  standard: 'Standard',
  shadowapro: 'Shadow a Pro',
  eduvisit: 'EduVisita',
};

export function InstituicaoProgramasPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['programas', 'minhas'],
    queryFn: () => programasApi.getMinhas(),
  });

  const estadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: string }) =>
      programasApi.updateEstado(id, estado),
    onSuccess: (_, { estado }) => {
      void qc.invalidateQueries({ queryKey: ['programas', 'minhas'] });
      const mensagem = estado === 'review' ? 'Submetido para revisão.' : 'Estado atualizado.';
      toast({ title: mensagem });
    },
    onError: () => toast({ title: 'Falha na transição de estado', variant: 'error' }),
  });

  const programas: Programa[] = data?.data ?? [];

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-ink-tertiary/10 pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            <GraduationCap size={12} /> Gestão de Programas
          </div>
          <h1 className="text-4xl font-black text-ink-primary tracking-tighter font-display">
            Os Meus <span className="text-accent italic">Programas.</span>
          </h1>
          <p className="text-ink-secondary mt-2 text-sm font-medium">
            {programas.length} programa{programas.length !== 1 ? 's' : ''} criado{programas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/app/instituicao/criar-programa">
          <Button className="h-12 px-6 rounded-2xl bg-accent text-white font-black uppercase text-[11px] tracking-widest flex items-center gap-2 hover:scale-[1.02] transition-all shadow-lg shadow-accent/20">
            <Plus size={16} /> Criar Programa
          </Button>
        </Link>
      </header>

      {/* Lista */}
      {programas.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-tertiary/20 bg-elevated/30 p-16 text-center space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-accent/10 flex items-center justify-center mx-auto">
            <GraduationCap size={32} className="text-accent/50" />
          </div>
          <div>
            <p className="font-black text-ink-primary">Nenhum programa criado ainda</p>
            <p className="text-sm text-ink-secondary mt-1">Cria o teu primeiro programa de acesso ao ecossistema.</p>
          </div>
          <Link to="/app/instituicao/criar-programa">
            <Button className="mt-2 rounded-xl font-black uppercase text-[10px] tracking-widest bg-accent text-white">
              <Plus size={14} className="mr-2" /> Criar Programa
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {programas.map((prog, idx) => (
            <motion.article
              key={prog.id}
              aria-label={prog.titulo}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-3xl border border-ink-tertiary/10 bg-elevated p-6 hover:border-accent/20 transition-all"
            >
              {/* Capa */}
              <div className="h-16 w-16 flex-shrink-0 rounded-2xl overflow-hidden bg-recessed flex items-center justify-center">
                {prog.capaUrl ? (
                  <img src={prog.capaUrl} alt={prog.titulo} className="h-full w-full object-cover" />
                ) : (
                  <GraduationCap size={24} className="text-ink-tertiary" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <EditorialStateBadge state={prog.estado} />
                  <Badge variant="outline" className="text-[9px] uppercase font-black tracking-wider">
                    {TIPO_LABEL[prog.tipo] ?? prog.tipo}
                  </Badge>
                  <Badge variant="secondary" className="text-[9px] uppercase font-black tracking-wider">
                    {prog.area}
                  </Badge>
                </div>
                <p className="font-black text-ink-primary text-lg tracking-tight truncate">{prog.titulo}</p>
                <p className="text-xs text-ink-tertiary mt-0.5">
                  {prog.vagas != null ? `${String(prog.vagas)} vagas` : 'Vagas ilimitadas'} · {prog.modalidade ?? 'Presencial'}
                </p>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {/* Ver (público) */}
                <Link to={`/app/programas/${prog.id}`}>
                  <Button size="sm" variant="ghost" className="h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest gap-1.5">
                    <Eye size={13} /> Ver
                  </Button>
                </Link>

                {/* Editar */}
                <Link to={`/app/instituicao/editar-programa/${prog.id}`}>
                  <Button size="sm" variant="ghost" className="h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest gap-1.5">
                    <Pencil size={13} /> Editar
                  </Button>
                </Link>

                {/* Ação de estado: draft → Submeter para Revisão */}
                {prog.estado === 'draft' && (
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={estadoMutation.isPending}
                    onClick={() => { estadoMutation.mutate({ id: prog.id, estado: 'review' }); }}
                    className="h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest gap-1.5 border-accent/30 text-accent hover:bg-accent/10"
                  >
                    <Send size={13} /> Submeter
                  </Button>
                )}

                {/* Ação de estado: approved → Publicar */}
                {prog.estado === 'approved' && (
                  <Button
                    size="sm"
                    isLoading={estadoMutation.isPending}
                    onClick={() => { estadoMutation.mutate({ id: prog.id, estado: 'published' }); }}
                    className="h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest gap-1.5 bg-accent text-white hover:scale-[1.02] shadow-md shadow-accent/20"
                  >
                    <Megaphone size={13} /> Publicar
                  </Button>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}
