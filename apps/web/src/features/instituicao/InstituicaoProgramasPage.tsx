import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, Badge, Spinner } from '@/components/ui';
import { BookOpen, Calendar, Users, ArrowRight, Building2 } from 'lucide-react';
import { http } from '@/lib/api/http';
import { motion } from 'motion/react';

export function InstituicaoProgramasPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['programas', 'list'],
    queryFn: () => http.get<any>('/programas'),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  const programas = data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-20 animate-in fade-in duration-1000">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Badge variant="info" className="bg-accent/10 text-accent border-accent/20 mb-3 px-3 py-1 uppercase tracking-widest text-[9px] font-black">Institutional Roadmaps</Badge>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter font-display">
            Catálogo de <span className="text-accent">Programas</span>
          </h1>
          <p className="text-text-secondary mt-2 max-w-lg leading-relaxed text-sm">
            Iniciativas estruturadas para o desenvolvimento de competências de elite.
          </p>
        </div>
      </header>

      {programas.length === 0 ? (
        <Card className="p-20 text-center border-dashed border-white/10 bg-white/[0.01]">
          <Building2 size={48} className="mx-auto text-text-muted mb-4 opacity-20" />
          <p className="text-sm text-text-muted uppercase font-black tracking-widest">Nenhum programa activo no momento</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programas.map((prog: any, idx: number) => (
            <motion.div
              key={prog.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link to={`/app/programas/${prog.id}`}>
                <Card className="group h-full relative overflow-hidden bg-surface-alt border-white/5 hover:border-accent/30 transition-all p-0 shadow-2xl">
                  <div className="aspect-video bg-gradient-to-br from-accent/10 to-transparent relative overflow-hidden">
                    {prog.capa?.url ? (
                      <img src={prog.capa.url} alt="" className="h-full w-full object-cover grayscale mix-blend-luminosity opacity-40 group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <BookOpen size={80} />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                       <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-[9px] uppercase font-black tracking-widest">{prog.modalidade}</Badge>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    <div>
                       <h3 className="text-xl font-bold text-text-primary group-hover:text-accent transition-colors leading-tight tracking-tight">
                         {prog.titulo}
                       </h3>
                       <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mt-2">{prog.instituicao?.nome || 'PDC Partner'}</p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                       <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase">
                             <Users size={12} className="text-accent" /> {prog.vagas || '---'} Vagas
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase">
                             <Calendar size={12} className="text-accent" /> {prog.duracao || 'N/A'}
                          </div>
                       </div>
                       <ArrowRight size={14} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
