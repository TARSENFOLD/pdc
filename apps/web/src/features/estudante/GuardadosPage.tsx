import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { bookmarkApi } from '@/lib/api/interactions';
import { Spinner, Badge, Card, EmptyState, Button } from '@/components/ui';
import { Bookmark as BookmarkIcon, FlaskConical, BookOpen, Building2, Rocket, ArrowRight, Zap, Search } from 'lucide-react';
import type { Bookmark } from '@pdc/shared';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

interface TipoConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  href: string;
}

const TIPO_CONFIG: Record<string, TipoConfig> = {
  curso: { label: 'Curso', icon: BookOpen, color: 'text-blue-400', href: '/app/cursos' },
  simulacao: { label: 'Simulação', icon: FlaskConical, color: 'text-accent', href: '/app/simulacoes' },
  experiencia: { label: 'Experiência', icon: Building2, color: 'text-success', href: '/experiencias' },
  projeto: { label: 'Projecto', icon: Rocket, color: 'text-violet-400', href: '/projetos' },
};

export function GuardadosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => bookmarkApi.list(),
  });

  const bookmarks: Bookmark[] = data?.data ?? [];

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-20 animate-in fade-in duration-1000">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Badge variant="info" className="bg-accent/10 text-accent border-accent/20 mb-3 px-3 py-1 uppercase tracking-widest text-[9px] font-black">Personal Sanctuary</Badge>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter font-display">
            A Minha <span className="text-accent">Selecção</span>
          </h1>
          <p className="text-text-secondary mt-2 max-w-lg leading-relaxed text-sm">
            Trajectórias vocacionais marcadas para análise e exploração futura.
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="secondary" size="md" className="bg-surface-alt border-white/5 font-bold text-[10px] uppercase tracking-widest px-4">
             <Search size={14} className="mr-2" /> Filtrar por Tipo
           </Button>
        </div>
      </header>

      {bookmarks.length === 0 ? (
        <section className="space-y-12">
           <EmptyState
             icon={BookmarkIcon}
             title="O teu Santuário está silencioso"
             description="Guarda simulações e experiências que despertam a tua curiosidade."
             ctaLabel="Explorar Catálogo"
             ctaTo="/app/explorar"
           />
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarks.map((bookmark, idx) => {
            const config = TIPO_CONFIG[bookmark.targetType] ?? TIPO_CONFIG.curso;
            const Icon = config.icon;
            return (
              <motion.div
                key={bookmark.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link to={`${config.href}/${bookmark.targetId}`}>
                  <Card className="group relative p-6 h-full bg-surface-alt border-white/5 hover:border-accent/30 transition-all shadow-xl flex flex-col justify-between overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                       <Icon size={80} />
                    </div>
                    <div>
                       <div className="flex justify-between items-start mb-6">
                          <div className={`p-3 rounded-2xl bg-white/5 ${config.color} group-hover:scale-110 transition-transform`}>
                             <Icon size={20} />
                          </div>
                          <Badge className="bg-white/5 text-text-muted border-white/5 text-[8px] font-black uppercase tracking-widest">{config.label}</Badge>
                       </div>
                       <h3 className="text-lg font-bold text-text-primary tracking-tight group-hover:text-accent transition-colors">
                         {bookmark.targetId}
                       </h3>
                    </div>
                    <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                       <div className="flex items-center gap-1.5 text-[9px] font-black text-accent uppercase tracking-widest">
                          <Zap size={12} /> Sugerir Match
                       </div>
                       <ArrowRight size={14} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
