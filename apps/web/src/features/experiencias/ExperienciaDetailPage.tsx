import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { experienciasApi } from '@/lib/api/experiencias';
import { likeApi, bookmarkApi, ratingsApi } from '@/lib/api/interactions';
import { Spinner, Badge, LikeButton, BookmarkButton, RatingStars, Card, Button, EmptyState } from '@/components/ui';
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
import { useTelemetry } from '@/hooks/useTelemetry';

// ─── Sub-component: Curriculum Section ──────────────────────────────────────────

function CurriculumSection({ discipline, index, onDwell }: { 
  discipline: any; index: number; onDwell: (id: string, ms: number) => void 
}) {
  const startRef = useRef<number>(Date.now());
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card 
        className={`p-5 cursor-pointer border-white/5 ${isExpanded ? 'bg-accent/[0.03] border-accent/20' : 'bg-surface-alt'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-lg bg-accent/5 flex items-center justify-center text-accent text-[10px] font-black">
                {(index + 1).toString().padStart(2, '0')}
              </div>
              <h4 className="font-bold text-text-primary">{discipline.disciplina}</h4>
           </div>
           <ChevronRight size={16} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
        {isExpanded && (
          <div className="pt-4 space-y-3">
            <p className="text-sm text-text-secondary leading-relaxed">{discipline.descricao}</p>
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
  
  const { data: exp, isLoading, isError } = useQuery({
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

  if (!id) return <Navigate to="/explorar" replace />;
  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;
  if (isError || !exp) return <div className="p-20 text-center"><EmptyState icon={AlertCircle} variant="error" title="Não encontrado" description="Esta experiência curricular não foi localizada no Oráculo." /></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-20 animate-in fade-in duration-1000">
      <SEOHead title={`${exp.titulo} | PDC v2`} description={exp.descricao} />

      <section className="relative h-[300px] rounded-[32px] overflow-hidden border border-white/5">
         <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-background opacity-40" />
         <div className="relative h-full flex flex-col justify-end p-8 space-y-4">
            <Badge className="w-fit bg-accent/10 text-accent border-accent/20 uppercase text-[9px] font-black">Experiência Curricular</Badge>
            <h1 className="text-4xl font-black text-text-primary tracking-tighter leading-tight">{exp.titulo}</h1>
            <div className="flex items-center gap-4 pt-4">
               <RatingStars targetType="experiencia" targetId={id} stats={ratingStats} />
               <LikeButton targetType="experiencia" targetId={id} initialCount={likeStatus?.count} initialLiked={likeStatus?.liked} />
               <BookmarkButton targetType="experiencia" targetId={id} initialBookmarked={isBookmarked} />
            </div>
         </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-8">
            <h3 className="text-2xl font-black text-text-primary tracking-tight flex items-center gap-3">
              <BookOpen className="text-accent" /> Grade Curricular
            </h3>
            <div className="grid grid-cols-1 gap-3">
               {(exp as any).gradeDestaque?.map((disc: any, i: number) => (
                 <CurriculumSection key={i} index={i} discipline={disc} onDwell={handleDisciplineDwell} />
               ))}
            </div>
            <p className="text-text-secondary leading-relaxed">{exp.descricao}</p>
         </div>

         <aside className="space-y-6">
            <Card className="p-8 bg-surface-alt border-accent/20 space-y-6 shadow-2xl">
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                     <Building2 size={20} className="text-accent" />
                     <p className="text-sm font-bold">{(exp as any).instituicao?.nome || 'Instituição Parceira'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                     <Calendar size={20} className="text-accent" />
                     <p className="text-sm font-bold">{new Date(exp.dataInicio).toLocaleDateString('pt-AO')}</p>
                  </div>
               </div>
               <Button className="w-full h-14 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-xs">Inscrever Agora</Button>
            </Card>
         </aside>
      </div>
    </div>
  );
}
