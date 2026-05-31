import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { programasApi } from '@/lib/api/programas';
import { Spinner, Badge, Button } from '@/components/ui';
import { GraduationCap, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/useToast';

const TIPO_LABEL: Record<string, string> = {
  standard: 'Standard',
  shadowapro: 'Shadow a Pro',
  eduvisit: 'EduVisita',
};

export function MeusProgramasPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['programas', 'meus'],
    queryFn: () => programasApi.getMeus(),
  });

  const concluirMutation = useMutation({
    mutationFn: (id: string) => programasApi.concluir(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['programas', 'meus'] });
      toast({ title: 'Programa marcado como concluído!' });
    },
    onError: () => toast({ title: 'Erro ao concluir programa', variant: 'error' }),
  });

  const inscricoes = data?.data ?? [];

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-20">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-accent/10 flex items-center justify-center">
            <GraduationCap size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-ink-primary tracking-tight">Os Meus Programas</h1>
            <p className="text-sm text-ink-tertiary">{inscricoes.length} programa{inscricoes.length !== 1 ? 's' : ''} inscrito{inscricoes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </header>

      {inscricoes.length === 0 ? (
        <div className="rounded-3xl border border-ink-tertiary/10 bg-elevated p-12 text-center space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-accent/10 flex items-center justify-center mx-auto">
            <GraduationCap size={32} className="text-accent/50" />
          </div>
          <div>
            <p className="font-black text-ink-primary">Sem programas inscritos</p>
            <p className="text-sm text-ink-secondary mt-1">Explora o catálogo e inscreve-te nos programas que te interessam.</p>
          </div>
          <Link to="/app/programas">
            <Button variant="outline" className="mt-2 rounded-xl font-bold uppercase text-[10px] tracking-widest">
              Explorar Programas
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {inscricoes.map((inscricao) => {
            const prog = inscricao.programa;
            if (!prog) return null;
            return (
              <div
                key={inscricao.id}
                className="flex items-center gap-4 rounded-2xl border border-ink-tertiary/10 bg-elevated p-5 transition-all hover:border-accent/20"
              >
                {/* Capa thumbnail */}
                <div className="h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden bg-recessed flex items-center justify-center">
                  {prog.capaUrl ? (
                    <img src={prog.capaUrl} alt={prog.titulo} className="h-full w-full object-cover" />
                  ) : (
                    <GraduationCap size={20} className="text-ink-tertiary" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link to={`/app/programas/${prog.id}`} className="hover:text-accent transition-colors">
                    <p className="font-black text-ink-primary truncate">{prog.titulo}</p>
                  </Link>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[9px] uppercase font-black tracking-wider">
                      {TIPO_LABEL[prog.tipo] ?? prog.tipo}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] uppercase font-black tracking-wider">
                      {prog.area}
                    </Badge>
                    {prog.modalidade && (
                      <span className="text-[10px] text-ink-tertiary font-medium">{prog.modalidade}</span>
                    )}
                  </div>
                </div>

                {/* Estado + ação */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {inscricao.concluido ? (
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle size={16} />
                      <span className="text-[10px] font-black uppercase tracking-wider">Concluído</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-ink-tertiary">
                        <Clock size={14} />
                        <span className="text-[10px] font-medium">Em progresso</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        isLoading={concluirMutation.isPending}
                        onClick={() => { concluirMutation.mutate(prog.id); }}
                        className="text-[10px] font-black uppercase tracking-widest rounded-xl h-8 px-3 text-accent hover:bg-accent/10"
                      >
                        Concluir
                      </Button>
                    </div>
                  )}
                  <Link to={`/app/programas/${prog.id}`}>
                    <ChevronRight size={16} className="text-ink-tertiary" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
