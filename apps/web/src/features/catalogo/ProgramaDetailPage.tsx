import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { programasApi } from '@/lib/api/programas';
import { Spinner, Badge } from '@/components/ui';
import { EditorialStateBadge } from '@/components/ui/EditorialStateBadge';
import { SEOHead } from '@/components/layout/SEOHead';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/lib/auth/auth-context';
import { toast } from '@/hooks/useToast';
import {
  Search, GraduationCap, Building2,
} from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import ProgramaHub from './programas/ProgramaHub';

const TIPO_LABEL: Record<string, string> = {
  standard: 'Standard',
  shadowapro: 'Shadow a Pro',
  eduvisit: 'EduVisita',
};

function isAlreadyEnrolledError(err: unknown): boolean {
  const e = err as { response?: { status?: number; data?: { error?: string } } };
  return e.response?.status === 409;
}

export function ProgramaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const programaId = id ?? '';
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const reducedMotion = useReducedMotion();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['programa', programaId],
    queryFn: () => programasApi.getById(programaId),
    enabled: !!programaId,
  });

  const inscreverMutation = useMutation({
    mutationFn: () => programasApi.inscrever(programaId),
    onSuccess: () => {
      setIsEnrolled(true);
      void qc.invalidateQueries({ queryKey: ['programas', 'meus'] });
      toast({ title: 'Inscrição realizada com sucesso!' });
    },
    onError: (err) => {
      if (isAlreadyEnrolledError(err)) {
        setIsEnrolled(true);
        toast({ title: 'Já estás inscrito neste programa.' });
      } else {
        toast({ title: 'Erro na inscrição. Tenta novamente.', variant: 'error' });
      }
    },
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-canvas"><Spinner size="lg" /></div>;
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
        <EmptyState icon={Search} title="Programa não encontrado" description="Este programa não existe ou não está disponível." />
      </div>
    );
  }

  const prog = data;
  const handleInscrever = () => {
    if (!user) { navigate('/login'); return; }
    inscreverMutation.mutate();
  };

  return (
    <>
      <SEOHead
        title={prog.titulo}
        description={prog.proposito || prog.titulo}
        url={`https://usepdc.com/programas/${programaId}`}
      />

      <div className="mx-auto max-w-6xl space-y-10 pb-32">

        {/* Hero */}
        <div className="relative min-h-64 w-full overflow-hidden rounded-lg border border-border bg-recessed shadow-[var(--elevation-2)]">
          {prog.capaUrl ? (
            <img src={prog.capaUrl} alt={prog.titulo} className="h-full w-full object-cover opacity-60" />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-tertiary">
              <GraduationCap size={48} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <EditorialStateBadge state={prog.estado} />
                <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 font-black text-[10px] uppercase">
                  {TIPO_LABEL[prog.tipo] ?? prog.tipo}
                </Badge>
                <Badge variant="outline" className="bg-canvas/50 backdrop-blur-md font-bold text-[10px] uppercase">
                  {prog.area}
                </Badge>
              </div>
              <h1 className="text-4xl font-black text-ink-primary tracking-tighter sm:text-5xl font-display leading-tight">
                {prog.titulo}
              </h1>
              {prog.instituicao?.nome && (
                <p className="text-sm font-bold text-ink-secondary mt-2 flex items-center gap-1.5">
                  <Building2 size={14} /> {prog.instituicao.nome}
                </p>
              )}
            </div>
          </div>
        </div>

        <ProgramaHub
          programa={prog}
          isEnrolled={isEnrolled}
          isAuthenticated={Boolean(user)}
          isEnrolling={inscreverMutation.isPending}
          reducedMotion={reducedMotion}
          onEnroll={handleInscrever}
          onLogin={() => { navigate('/login'); }}
        />
      </div>
    </>
  );
}
