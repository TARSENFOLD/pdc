import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, Spinner, Badge, Button, Avatar } from '@/components/ui';
import { Rocket, Star, MessageSquare, ExternalLink, Filter, Plus, ShieldCheck } from 'lucide-react';
import { http } from '@/lib/api/http';
import { motion } from 'motion/react';

export function ProjetoListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['projetos', 'list'],
    queryFn: () => http.get<any>('/projetos'),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  const projetos = data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-20 animate-in fade-in duration-1000">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Badge variant="info" className="bg-accent/10 text-accent border-accent/20 mb-3 px-3 py-1 uppercase tracking-widest text-[9px] font-black">Talent Showcase</Badge>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter font-display">
            Portfólio de <span className="text-accent">Evidências</span>
          </h1>
          <p className="text-text-secondary mt-2 max-w-lg leading-relaxed text-sm">
            Projectos reais validados por mentores de elite e alimentados por telemetria comportamento.
          </p>
        </div>
        <div className="flex gap-3">
           <Button variant="secondary" size="sm" className="bg-surface-alt border-white/5 font-bold uppercase tracking-widest text-[10px]">
             <Filter size={14} className="mr-2" /> Filtrar
           </Button>
           <Button asChild size="sm" className="bg-accent text-white font-bold uppercase tracking-widest text-[10px]">
             <Link to="/app/projetos/novo"><Plus size={14} className="mr-2" /> Publicar Projecto</Link>
           </Button>
        </div>
      </header>

      {projetos.length === 0 ? (
        <Card className="p-20 text-center border-dashed border-white/10 bg-white/[0.01]">
          <Rocket size={48} className="mx-auto text-text-muted mb-4 opacity-20" />
          <p className="text-sm text-text-muted uppercase font-black tracking-widest">Nenhum projecto publicado hoje</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projetos.map((proj: any, idx: number) => (
            <motion.div
              key={proj.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="group h-full relative overflow-hidden bg-surface-alt border-white/5 hover:border-accent/30 transition-all p-0 shadow-2xl flex flex-col">
                <div className="aspect-video bg-gradient-to-br from-surface-raised to-background relative overflow-hidden">
                   {proj.capa?.url ? (
                     <img src={proj.capa.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60" />
                   ) : (
                     <div className="absolute inset-0 flex items-center justify-center opacity-5">
                       <Rocket size={100} />
                     </div>
                   )}
                   <div className="absolute top-4 left-4">
                      <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-[8px] uppercase font-black tracking-widest">
                         {proj.area || 'Geral'}
                      </Badge>
                   </div>
                </div>

                <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                   <div className="space-y-3">
                      <h3 className="text-xl font-bold text-text-primary group-hover:text-accent transition-colors leading-tight tracking-tight">
                        {proj.titulo}
                      </h3>
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                        {proj.descricao}
                      </p>
                   </div>

                   <div className="pt-6 border-t border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <Avatar src={proj.autor?.foto?.url} fallback={proj.autor?.nome?.[0] || '?'} className="h-6 w-6 border border-white/10" />
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{proj.autor?.nome}</span>
                         </div>
                         <div className="flex items-center gap-1 text-[9px] font-black text-success uppercase">
                            <ShieldCheck size={12} /> Validado
                         </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                         <div className="flex items-center gap-4 text-text-muted">
                            <div className="flex items-center gap-1 text-[10px] font-bold">
                               <Star size={12} className="text-accent" /> 12
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-bold">
                               <MessageSquare size={12} /> 4
                            </div>
                         </div>
                         <Link to={`/app/projetos/${proj.id}`} className="text-accent hover:text-accent-hover transition-colors">
                            <ExternalLink size={16} />
                         </Link>
                      </div>
                   </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
