import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { programasApi } from '@/lib/api/programas';
import { Spinner, Badge, Button, Card } from '@/components/ui';
import { EditorialStateBadge } from '@/components/ui/EditorialStateBadge';
import { SEOHead } from '@/components/layout/SEOHead';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/lib/auth/auth-context';
import { toast } from '@/hooks/useToast';
import {
  Search, GraduationCap, MapPin, Users, Clock, BookOpen,
  FlaskConical, Building2, CheckCircle, LogIn,
} from 'lucide-react';
import type { Programa } from '@pdc/shared';
import { motion } from 'motion/react';

type ProgramaDetail = Programa & {
  cursos?: Array<{ id: string; titulo: string; nivel?: string; capaUrl?: string | null }>;
  experiencias?: Array<{ id: string; titulo: string; area?: string }>;
  simulacoes?: Array<{ id: string; titulo: string }>;
  instituicao?: { id: string; nome?: string; logoUrl?: string };
};

const TIPO_LABEL: Record<string, string> = {
  standard: 'Standard',
  shadowapro: 'Shadow a Pro',
  eduvisit: 'EduVisita',
};

const MODALIDADE_ICON: Record<string, typeof MapPin> = {
  presencial: MapPin,
  online: Building2,
  hibrido: Building2,
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

  const prog = data as ProgramaDetail;
  const cursosInternos = prog.cursos ?? [];
  const experienciasInternas = prog.experiencias ?? [];
  const simulacoesInternas = prog.simulacoes ?? [];
  const totalAssets = cursosInternos.length + experienciasInternas.length + simulacoesInternas.length;
  const ModalidadeIcon = MODALIDADE_ICON[prog.modalidade ?? 'presencial'] ?? MapPin;

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

      <div className="mx-auto max-w-5xl space-y-12 pb-32 animate-in fade-in duration-700">

        {/* Hero */}
        <div className="relative h-64 w-full overflow-hidden rounded-[40px] shadow-2xl border border-ink-tertiary/10 bg-recessed">
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

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Conteúdo principal */}
          <div className="lg:col-span-8 space-y-8">

            {/* Propósito */}
            <Card className="p-8 bg-elevated border-ink-tertiary/10 rounded-[32px]">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-accent mb-4">Sobre o Programa</h2>
              <p className="leading-relaxed text-ink-secondary whitespace-pre-wrap text-sm">{prog.proposito}</p>
            </Card>

            {/* Metodologia */}
            {prog.metodologia && (
              <Card className="p-8 bg-elevated border-ink-tertiary/10 rounded-[32px]">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-accent mb-4">Metodologia</h2>
                <p className="leading-relaxed text-ink-secondary whitespace-pre-wrap text-sm">{prog.metodologia}</p>
              </Card>
            )}

            {/* Conteúdos incluídos */}
            {totalAssets > 0 && (
              <Card className="p-8 bg-elevated border-ink-tertiary/10 rounded-[32px]">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-accent mb-6">
                  O Que Está Incluído
                </h2>
                <div className="space-y-6">

                  {cursosInternos.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <BookOpen size={14} className="text-accent" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-ink-tertiary">
                          Cursos ({cursosInternos.length})
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {cursosInternos.map((c) => (
                          <li key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-recessed/50 border border-ink-tertiary/10">
                            <div className="h-8 w-8 rounded-lg overflow-hidden bg-recessed flex-shrink-0">
                              {c.capaUrl ? (
                                <img src={c.capaUrl} alt={c.titulo} className="h-full w-full object-cover" />
                              ) : (
                                <BookOpen size={14} className="text-ink-tertiary m-auto mt-1.5" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-ink-secondary">{c.titulo}</span>
                            {c.nivel && (
                              <Badge variant="outline" className="ml-auto text-[9px] uppercase font-bold">{c.nivel}</Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {experienciasInternas.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin size={14} className="text-accent" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-ink-tertiary">
                          Experiências ({experienciasInternas.length})
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {experienciasInternas.map((e) => (
                          <li key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-recessed/50 border border-ink-tertiary/10">
                            <MapPin size={14} className="text-accent flex-shrink-0" />
                            <span className="text-sm font-medium text-ink-secondary">{e.titulo}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {simulacoesInternas.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FlaskConical size={14} className="text-accent" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-ink-tertiary">
                          Simulações ({simulacoesInternas.length})
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {simulacoesInternas.map((s) => (
                          <li key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-recessed/50 border border-ink-tertiary/10">
                            <FlaskConical size={14} className="text-accent flex-shrink-0" />
                            <span className="text-sm font-medium text-ink-secondary">{s.titulo}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Painel lateral */}
          <div className="lg:col-span-4">
            <Card className="p-8 bg-recessed border-ink-tertiary/10 rounded-[40px] shadow-2xl sticky top-8 space-y-6">

              {/* Detalhes do programa */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-tertiary">Detalhes</p>

                {prog.modalidade && (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-elevated flex items-center justify-center flex-shrink-0">
                      <ModalidadeIcon size={16} className="text-accent" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-ink-tertiary">Modalidade</p>
                      <p className="text-sm font-bold text-ink-primary capitalize">{prog.modalidade}</p>
                    </div>
                  </div>
                )}

                {prog.vagas != null && (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-elevated flex items-center justify-center flex-shrink-0">
                      <Users size={16} className="text-accent" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-ink-tertiary">Vagas</p>
                      <p className="text-sm font-bold text-ink-primary">{prog.vagas}</p>
                    </div>
                  </div>
                )}

                {prog.duracao && (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-elevated flex items-center justify-center flex-shrink-0">
                      <Clock size={16} className="text-accent" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-ink-tertiary">Duração</p>
                      <p className="text-sm font-bold text-ink-primary">{prog.duracao}</p>
                    </div>
                  </div>
                )}

                {prog.dataInicio && (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-elevated flex items-center justify-center flex-shrink-0">
                      <Clock size={16} className="text-accent" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-ink-tertiary">Início</p>
                      <p className="text-sm font-bold text-ink-primary">
                        {new Date(prog.dataInicio).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* CTA de inscrição */}
              <div className="pt-4 border-t border-ink-tertiary/10 space-y-3">
                {isEnrolled ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-success/10 border border-success/20">
                      <CheckCircle size={20} className="text-success flex-shrink-0" />
                      <div>
                        <p className="text-sm font-black text-ink-primary">Inscrito</p>
                        <p className="text-[10px] text-ink-tertiary">Acompanha o teu progresso na aba "Os Meus Programas".</p>
                      </div>
                    </div>
                    <Link to="/app/meus-programas">
                      <Button variant="outline" className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest">
                        Ver Os Meus Programas
                      </Button>
                    </Link>
                  </motion.div>
                ) : !user ? (
                  <Button
                    onClick={() => { navigate('/login'); }}
                    className="w-full h-14 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-xl shadow-accent/20 flex items-center justify-center gap-2"
                  >
                    <LogIn size={16} /> Entrar para se Inscrever
                  </Button>
                ) : (
                  <Button
                    onClick={handleInscrever}
                    isLoading={inscreverMutation.isPending}
                    className="w-full h-14 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-xl shadow-accent/20"
                  >
                    Inscrever-me
                  </Button>
                )}
              </div>

              {/* Requisitos */}
              {prog.requisitos && (
                <div className="pt-4 border-t border-ink-tertiary/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink-tertiary mb-2">Requisitos</p>
                  <p className="text-xs text-ink-secondary leading-relaxed">{prog.requisitos}</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
