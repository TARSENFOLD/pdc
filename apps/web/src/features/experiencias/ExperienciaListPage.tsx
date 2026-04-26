import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { experienciasApi } from '@/lib/api/experiencias';
import { Spinner, Card, Pagination, EmptyState } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';
import type { Experiencia } from '@pdc/shared';
import { motion } from 'motion/react';
import { Sparkles, MapPin, Calendar, Building2, ChevronRight, Search } from 'lucide-react';

function ExperienciaCard({ exp, index }: { exp: Experiencia; index: number }) {
  const inicio = new Date(exp.dataInicio).toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' });
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/app/experiencias/${exp.id}`} className="group">
        <Card className="h-full bg-elevated/40 backdrop-blur-md border-white/5 overflow-hidden flex flex-col hover:bg-white/[0.02] hover:border-white/10 transition-all duration-500 rounded-[32px] shadow-2xl">
          <div className="aspect-[16/10] w-full bg-[#0A0A0A] overflow-hidden relative">
            {exp.capaUrl ? (
              <img 
                src={exp.capaUrl} 
                alt={exp.titulo} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-background">
                <Building2 size={48} className="text-ink-tertiary/20" />
              </div>
            )}
            
            <div className="absolute top-4 left-4">
              <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest text-accent">
                 Instituição Validada
              </div>
            </div>
          </div>
          
          <div className="p-8 flex-1 flex flex-col gap-4">
            <h3 className="text-2xl font-black text-ink-primary tracking-tighter group-hover:text-accent transition-colors duration-300 font-display line-clamp-1">
              {exp.titulo}
            </h3>
            
            <p className="text-ink-secondary text-sm font-medium line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
              {exp.descricao}
            </p>
            
            <div className="mt-auto pt-6 flex items-center justify-between border-t border-white/5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-ink-tertiary text-[10px] font-bold uppercase tracking-wider">
                    <Calendar size={12} /> {inicio}
                </div>
                <div className="flex items-center gap-1.5 text-accent text-[9px] font-black uppercase tracking-[0.1em]">
                    <MapPin size={10} /> Local Presencial
                </div>
              </div>
              
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all shadow-lg">
                  <ChevronRight size={18} strokeWidth={3} />
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

export function ExperienciaListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['experiencias', page, search],
    queryFn: () => experienciasApi.list({ page, pageSize: 12 }),
  });

  const experiencias = data?.data ?? [];
  const pageCount = data?.pagination.pageCount ?? 1;

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-20 sm:px-6">
      <div className="w-full max-w-6xl">
        <Spinner size="lg" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-20 sm:px-6 lg:px-8 font-sans">
      <SEOHead title="Experiências de Realidade" description="Entra nos laboratórios e salas das melhores instituições de Angola." url="https://usepdc.com/experiencias" />
      
      {/* Camada de Profundidade */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('/images/pattern-afro.svg')] bg-repeat" />

      <div className="mx-auto max-w-7xl relative">
        {/* Header Soberano */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-[0.2em] mb-6">
               <Sparkles size={12} /> Portas Abertas
            </div>
            <h1 className="text-4xl font-black text-ink-primary tracking-tighter sm:text-7xl font-display leading-[0.9]">
              Viver a <span className="text-accent italic">Realidade.</span>
            </h1>
            <p className="text-ink-secondary mt-8 text-xl font-medium leading-relaxed max-w-lg">
              Roteiros imersivos desenhados para validar o teu interesse real em instituições de elite angolanas.
            </p>
          </div>
          
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary group-focus-within:text-accent transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Procurar local..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); }}
              className="w-full pl-12 pr-4 py-4 bg-elevated/20 backdrop-blur-md border border-white/5 rounded-2xl text-ink-primary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all font-medium"
            />
          </div>
        </header>

        <div className="mt-16">
          {isError ? (
            <EmptyState
              icon={Building2}
              variant="error"
              title="Erro de Sincronização"
              description="Não foi possível aceder aos roteiros institucionais. O Oráculo está a ser estabilizado."
              onRetry={() => { window.location.reload(); }}
            />
          ) : experiencias.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Sem experiências ativas"
              description="Novas instituições estão a preparar os seus roteiros imersivos para este ciclo."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
                {experiencias.map((exp, i) => (
                  <ExperienciaCard key={exp.id} exp={exp} index={i} />
                ))}
              </div>
              {pageCount > 1 && (
                <div className="pt-16 border-t border-white/5 flex justify-center">
                  <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </div>

        <footer className="mt-32 pt-12 border-t border-white/5 text-center">
          <div className="inline-flex items-center gap-6 p-4 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
            <Link to="/login" className="text-sm font-black text-ink-tertiary hover:text-accent tracking-widest uppercase transition-colors px-6">Entrar</Link>
            <div className="h-4 w-px bg-white/10" />
            <Link to="/criar-conta" className="text-sm font-black text-accent hover:text-white tracking-widest uppercase transition-colors px-6">Criar Conta Académica</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
