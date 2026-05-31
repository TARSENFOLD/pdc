import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { experienciasApi } from '@/lib/api/experiencias';
import { likeApi, bookmarkApi, ratingsApi } from '@/lib/api/interactions';
import { Spinner, Badge, LikeButton, BookmarkButton, RatingStars, Card, Button, EmptyState } from '@/components/ui';
import { EditorialStateBadge } from '@/components/ui/EditorialStateBadge';
import { SEOHead } from '@/components/layout/SEOHead';
import {
  Building2,
  Calendar,
  BookOpen,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { APPLE_SPRING } from '@/lib/animations';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useAuth } from '@/lib/auth/auth-context';
import { toast } from '@/hooks/useToast';
import type { Experiencia } from '@pdc/shared';

// ─── Sub-component: Curriculum Section ──────────────────────────────────────────

function CurriculumSection({ discipline, index, onDwell }: { 
  discipline: { disciplina: string; descricao: string; relevanciaMercado: string }; index: number; onDwell: (id: string, ms: number) => void 
}) {
  const startRef = useRef(Date.now());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      startRef.current = Date.now();
    } else {
      const ms = Date.now() - startRef.current;
      if (ms > 1000) onDwell(discipline.disciplina, ms);
    }
  }, [isExpanded, discipline.disciplina, onDwell]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...APPLE_SPRING, delay: index * 0.05 }}>
      <Card 
        className={`p-5 cursor-pointer border-white/5 ${isExpanded ? 'bg-accent/[0.03] border-accent/20' : 'bg-recessed'}`}
        onClick={() => { setIsExpanded(!isExpanded); }}
      >
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-lg bg-accent/5 flex items-center justify-center text-accent text-[10px] font-black">
                {(index + 1).toString().padStart(2, '0')}
              </div>
              <h4 className="font-bold text-ink-primary">{discipline.disciplina}</h4>
           </div>
           <ChevronRight size={16} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
        {isExpanded && (
          <div className="pt-4 space-y-3">
            <p className="text-sm text-ink-secondary leading-relaxed">{discipline.descricao}</p>
            <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Relevância: {discipline.relevanciaMercado}</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────────

export function ExperienciaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { track } = useTelemetry();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const { data: exp, isLoading, isError } = useQuery<Experiencia>({
    queryKey: ['experiencias', id ?? ''],
    queryFn: () => experienciasApi.getById(id ?? ''),
    enabled: !!id,
  });

  const { data: likeStatus } = useQuery({
    queryKey: ['experiencia', id, 'likes'],
    queryFn: () => likeApi.getStatus('experiencia', id ?? ''),
    enabled: !!id,
  });

  const { data: ratingStats } = useQuery({
    queryKey: ['experiencia', id, 'ratings'],
    queryFn: () => ratingsApi.getStats('experiencia', id ?? ''),
    enabled: !!id,
  });

  const { data: bookmarks } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => bookmarkApi.list(),
  });
  const isBookmarked = bookmarks?.data.some(b => b.targetType === 'experiencia' && b.targetId === id) ?? false;

  useEffect(() => {
    if (exp) {
      track('experiencia.visualizada', { experienceId: id, titulo: exp.titulo });
    }
  }, [exp, id, track]);

  const handleDisciplineDwell = useCallback((discId: string, ms: number) => {
    track('experiencia.timeline_click', { experienceId: id, discipline: discId, dwellTime: ms });
  }, [id, track]);

  // BUG-009: botão "Inscrever Agora" não tinha handler nem mutação
  const inscricaoMutation = useMutation({
    mutationFn: () => experienciasApi.inscrever(id ?? ''),
    onSuccess: () => {
      toast({ title: 'Inscrição realizada com sucesso!' });
    },
    onError: () => toast({ title: 'Falha ao inscrever. Tenta novamente.', variant: 'error' }),
  });

  const handleInscrever = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    inscricaoMutation.mutate();
  };

  if (!id) return <Navigate to="/explorar" replace />;
  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;
  // BUG-010: "Oráculo" é copy interna banida pela CLAUDE.md § 6
  if (isError || !exp) return <div className="p-20 text-center"><EmptyState icon={AlertCircle} variant="error" title="Não encontrado" description="Esta experiência curricular não foi encontrada." /></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-20 animate-in fade-in duration-1000">
      <SEOHead title={`${exp.titulo} | PDC`} description={exp.descricao} />

      <section className="relative h-[300px] rounded-[32px] overflow-hidden border border-white/5">
         <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-background opacity-40" />
         <div className="relative h-full flex flex-col justify-end p-8 space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="w-fit bg-accent/10 text-accent border-accent/20 uppercase text-[9px] font-black">Experiência Curricular</Badge>
              <EditorialStateBadge state={exp.estado} />
            </div>
            <h1 className="text-4xl font-black text-ink-primary tracking-tighter leading-tight">{exp.titulo}</h1>
            <div className="flex items-center gap-4 pt-4">
               <RatingStars targetType="experiencia" targetId={id} stats={ratingStats} />
               <LikeButton targetType="experiencia" targetId={id} initialCount={likeStatus?.count} initialLiked={likeStatus?.liked} />
               <BookmarkButton targetType="experiencia" targetId={id} initialBookmarked={isBookmarked} />
            </div>
         </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-8">
            <h3 className="text-2xl font-black text-ink-primary tracking-tight flex items-center gap-3">
              <BookOpen className="text-accent" /> Grade Curricular
            </h3>
            <div className="grid grid-cols-1 gap-3">
               {exp.gradeDestaque?.map((disc, i: number) => (
                 <CurriculumSection key={i} index={i} discipline={disc} onDwell={handleDisciplineDwell} />
               ))}
            </div>
            <p className="text-ink-secondary leading-relaxed">{exp.descricao}</p>
         </div>

         <aside className="space-y-6">
            <Card className="p-8 bg-recessed border-accent/20 space-y-6 shadow-2xl">
               <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <Building2 size={20} className="text-accent" />
                      <p className="text-sm font-bold">{exp.instituicao?.nome || 'Instituição Parceira'}</p>
                   </div>
                  <div className="flex items-center gap-3">
                     <Calendar size={20} className="text-accent" />
                     <p className="text-sm font-bold">{exp.dataInicio ? new Date(exp.dataInicio).toLocaleDateString('pt-AO') : 'Data a anunciar'}</p>
                  </div>
               </div>
               {/* BUG-009: onClick e estado de loading adicionados */}
               <Button
                 className="w-full h-14 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-xs"
                 onClick={handleInscrever}
                 disabled={inscricaoMutation.isPending || inscricaoMutation.isSuccess}
               >
                 {inscricaoMutation.isPending ? 'A inscrever...' : inscricaoMutation.isSuccess ? 'Inscrito' : 'Inscrever Agora'}
               </Button>
            </Card>
         </aside>
      </div>
    </div>
  );
}
