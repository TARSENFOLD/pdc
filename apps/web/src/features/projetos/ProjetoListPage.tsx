import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, Button, Avatar, EmptyState } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';
import { 
  Rocket, 
  Star, 
  Plus, 
  ShieldCheck, 
  Search,
  ChevronRight,
  Layers
} from 'lucide-react';
import { http } from '@/lib/api/http';
import { motion } from 'motion/react';
import { APPLE_SPRING } from '@/lib/animations';
import type { Projeto } from '@pdc/shared';

function ProjetoCard({ proj, index }: { proj: Projeto; index: number }) {
  const p = proj;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...APPLE_SPRING, delay: index * 0.05 }}
    >
      <Link to={`/app/projetos/${p.id}`} className="block group">
        <Card className="h-full bg-surface-raised/40 backdrop-blur-md border-white/5 overflow-hidden flex flex-col hover:bg-white/[0.02] hover:border-white/10 transition-all duration-500 rounded-[32px] shadow-2xl">
          <div className="aspect-[16/10] w-full bg-[#0A0A0A] overflow-hidden relative">
            {p.mediaUrls?.[0] ? (
              <img 
                src={p.mediaUrls[0]} 
                alt={p.titulo} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-background">
                <Layers size={48} className="text-text-muted/20" />
              </div>
            )}
            
            <div className="absolute top-4 left-4">
              <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest text-accent">
                {p.area || 'Inovação'}
              </div>
            </div>
          </div>
          
          <div className="p-8 flex-1 flex flex-col gap-4">
            <div className="flex items-center gap-3">
               <Avatar src={p.autor?.foto?.url ?? undefined} fallback={p.autor?.nome[0] || 'T'} className="h-7 w-7 border border-accent/20" />
               <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{p.autor?.nome || 'Talento PDC'}</span>
            </div>

            <h3 className="text-2xl font-black text-text-primary tracking-tighter group-hover:text-accent transition-colors duration-300 font-display line-clamp-1">
              {p.titulo}
            </h3>
            
            <p className="text-text-secondary text-sm font-medium line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
              {p.descricao}
            </p>
            
            <div className="mt-auto pt-6 flex items-center justify-between border-t border-white/5">
              <div className="flex items-center gap-4 text-text-muted">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                    <Star size={14} className="text-accent" /> 12
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                    <ShieldCheck size={14} className="text-success" /> Validado
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

export function ProjetoListPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['projetos', 'list', search],
    queryFn: () => http.get<Projeto[]>('/projetos'),
  });

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-20 sm:px-6">
      <div className="w-full max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Array.from({length: 6}).map((_, i) => <div key={i} className="h-96 bg-surface-raised/20 animate-pulse rounded-[32px]" />)}
        </div>
      </div>
    </div>
  );

  const projetos = (data || []).filter(p => 
    p.titulo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-20 sm:px-6 lg:px-8 font-sans relative">
      <SEOHead title="Portfólio de Evidências" description="Explora ativos reais de mérito validados por mentores de elite." />
      
      {/* Camada de Profundidade */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('/images/pattern-afro.svg')] bg-repeat" />

      <div className="mx-auto max-w-7xl relative">
        {/* Header Soberano */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-[0.2em] mb-6">
               <Rocket size={12} /> Laboratório de Mérito
            </div>
            <h1 className="text-4xl font-black text-text-primary tracking-tighter sm:text-7xl font-display leading-[0.9]">
              Ativos em <span className="text-accent italic">Órbita.</span>
            </h1>
            <p className="text-text-secondary mt-8 text-xl font-medium leading-relaxed max-w-lg">
              Evidência real de execução técnica. Projectos validados que alimentam a autoridade do teu Perfil Vocacional.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative group w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Procurar ativo..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); }}
                className="w-full pl-12 pr-4 py-4 bg-surface-raised/20 backdrop-blur-md border border-white/5 rounded-2xl text-text-primary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all font-medium"
              />
            </div>
            <Link to="/app/projetos/novo" className="w-full sm:w-auto">
              <Button className="w-full h-14 rounded-2xl bg-text-primary text-background font-black uppercase tracking-widest text-[11px] px-8 hover:bg-accent hover:text-white transition-all shadow-xl">
                <Plus size={16} className="mr-2" /> Lançar Projeto
              </Button>
            </Link>
          </div>
        </header>

        <div className="mt-16">
          {isError ? (
            <EmptyState
              icon={Layers}
              variant="error"
              title="Erro de Sincronização"
              description="Não foi possível aceder ao laboratório de projetos. O Oráculo está a ser estabilizado."
              onRetry={() => { window.location.reload(); }}
            />
          ) : projetos.length === 0 ? (
            <EmptyState
              icon={Rocket}
              title={search ? "Sem ativos localizados" : "Laboratório em Silêncio"}
              description={search ? `Não encontrámos projetos para "${search}".` : "Sê o primeiro a lançar um ativo de mérito para validação do Comitê Científico."}
              {...(search ? { 
                ctaLabel: "Ver Todos", 
                onRetry: () => { setSearch(''); } 
              } : {
                ctaLabel: "Lançar Ativo",
                onRetry: () => { window.location.href = '/app/projetos/novo'; }
              })}
            />
          ) : (
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {projetos.map((p, i) => (
                <ProjetoCard key={p.id} proj={p} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
