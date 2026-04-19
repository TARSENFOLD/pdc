import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { cursosApi } from '@/lib/api/cursos';
import { Card, Pagination, CardGridSkeleton, EmptyState, Button } from '@/components/ui';
import type { Curso } from '@pdc/shared';
import { BookOpen, Search, Clock, GraduationCap, ChevronRight, Filter } from 'lucide-react';
import { motion } from 'motion/react';

function CursoCard({ curso, index }: { curso: Curso; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/app/cursos/${curso.id}`} className="group">
        <Card className="h-full bg-surface-raised/40 backdrop-blur-md border-white/5 overflow-hidden flex flex-col hover:bg-white/[0.02] hover:border-white/10 transition-all duration-500 rounded-[32px] shadow-2xl">
          <div className="aspect-[16/10] w-full bg-[#0A0A0A] overflow-hidden relative">
            {curso.capaUrl ? (
              <img 
                src={curso.capaUrl} 
                alt={curso.titulo} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-background">
                <BookOpen size={48} className="text-text-muted/20" />
              </div>
            )}
            
            <div className="absolute top-4 left-4">
              <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest text-accent">
                Certificação PDC
              </div>
            </div>
          </div>
          
          <div className="p-8 flex-1 flex flex-col gap-4">
            <h3 className="text-xl font-black text-text-primary tracking-tight group-hover:text-accent transition-colors duration-300 font-display line-clamp-1">
              {curso.titulo}
            </h3>
            
            <p className="text-text-secondary text-sm font-medium line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
              {curso.descricao}
            </p>
            
            <div className="mt-auto pt-6 flex items-center justify-between border-t border-white/5">
              <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-bold uppercase tracking-wider">
                  <Clock size={12} /> {curso.totalHoras}h de m\u00fasculo
              </div>
              
              <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
                  <ChevronRight size={16} strokeWidth={3} />
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

export function CursoListPage() {
  const [search, setSearch] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cursos', search, page],
    queryFn: () =>
      cursosApi.list({ page, pageSize: 12, ...(search ? { search } : {}) }),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(inputValue);
    setPage(1);
  }

  const cursos = data?.data ?? [];
  const pageCount = data?.pagination.pageCount ?? 1;

  if (isLoading) return <div className="p-8 lg:p-12"><CardGridSkeleton /></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-12 pb-20 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-700">
      
      {/* Header Soberano */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-[0.2em] mb-6">
             <GraduationCap size={12} /> Academia de Elite
          </div>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter sm:text-6xl font-display leading-[0.95]">
            Módulos de <span className="text-accent italic">Aptidão.</span>
          </h1>
          <p className="text-text-secondary mt-6 text-lg font-medium leading-relaxed">
            Desenvolve as competências exigidas pelo mercado mundial. O teu progresso alimenta diretamente o teu Perfil Vocacional.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Pesquisar formação..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-surface-raised/40 backdrop-blur-md border border-white/5 rounded-2xl text-text-primary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all font-medium"
            />
          </form>
          <Button variant="secondary" className="h-14 rounded-2xl border-white/5 bg-white/5 backdrop-blur-md px-6 hover:bg-white/10">
            <Filter size={18} />
          </Button>
        </div>
      </header>

      {isError ? (
        <div className="py-20">
          <EmptyState
            icon={BookOpen}
            variant="error"
            title="Erro de Sincronização"
            description="Não foi possível aceder à base de conhecimentos. O Oráculo está a ser estabilizado."
            onRetry={() => { window.location.reload(); }}
          />
        </div>
      ) : cursos.length === 0 ? (
        <div className="py-20">
          <EmptyState
            icon={Search}
            title={search ? "Sem resultados de elite" : "Fronteira do Conhecimento"}
            description={search ? `Não encontrámos módulos compatíveis com "${search}".` : "Novos módulos de formação estão a ser validados pelo Comitê Científico."}
            {...(search ? { 
              ctaLabel: "Limpar Filtros", 
              onRetry: () => { setSearch(''); setInputValue(''); } 
            } : {})}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cursos.map((curso, i) => (
              <CursoCard key={curso.id} curso={curso} index={i} />
            ))}
          </div>
          {pageCount > 1 && (
            <div className="pt-12 border-t border-white/5">
              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
