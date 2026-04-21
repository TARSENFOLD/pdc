import { useEffect, useState } from 'react';
import { GraduationCap, Sparkles, Clock, Target, ChevronRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { simulacoesApi } from '../../lib/api/simulacoes';
import type { Simulacao } from '@pdc/shared';
import { Card, CardGridSkeleton } from '../../components/ui';
import { motion } from 'motion/react';

export const SimulacaoListPage = () => {
  const [simulacoes, setSimulacoes] = useState<Simulacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    simulacoesApi.list()
      .then(res => { setSimulacoes(res.data); })
      .catch((err: unknown) => { console.error('Erro ao carregar simulações:', err); })
      .finally(() => { setLoading(false); });
  }, []);

  const filtered = simulacoes.filter(s => 
    s.titulo.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 lg:p-12"><CardGridSkeleton /></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-12 pb-20 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-700">
      
      {/* Header Soberano */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-[0.2em] mb-6">
             <Sparkles size={12} /> Oráculo de Experiência
          </div>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter sm:text-6xl font-display leading-[0.95]">
            Vitrinas <span className="text-accent italic">Vivas.</span>
          </h1>
          <p className="text-text-secondary mt-6 text-lg font-medium leading-relaxed">
            Experimenta o futuro antes de decidires. As nossas simulações capturam o teu m\u00fasculo cognitivo em tempo real.
          </p>
        </div>
        
        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Procurar simulação..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            className="w-full pl-12 pr-4 py-4 bg-surface-raised/40 backdrop-blur-md border border-white/5 rounded-2xl text-text-primary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all font-medium"
          />
        </div>
      </header>

      {/* Grid de Elite */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((sim, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={sim.id}
          >
            <Link to={`/app/simulacoes/${sim.id}`} className="block group">
              <Card className="h-full bg-surface-raised/40 backdrop-blur-md border-white/5 overflow-hidden flex flex-col hover:bg-white/[0.02] hover:border-white/10 transition-all duration-500 rounded-[32px] shadow-2xl">
                <div className="aspect-[16/10] w-full bg-[#0A0A0A] overflow-hidden relative">
                  {sim.capaUrl ? (
                    <img 
                      src={sim.capaUrl} 
                      alt={sim.titulo} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-background">
                      <GraduationCap size={48} className="text-text-muted/20" />
                    </div>
                  )}
                  
                  {/* Metadata Overlay */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest text-accent">
                      Tipo {sim.tipo}
                    </div>
                  </div>
                </div>
                
                <div className="p-8 flex-1 flex flex-col gap-4">
                  <h3 className="text-2xl font-black text-text-primary tracking-tight group-hover:text-accent transition-colors duration-300 font-display line-clamp-1">
                    {sim.titulo}
                  </h3>
                  
                  <p className="text-text-secondary text-sm font-medium line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                    {sim.descricao}
                  </p>
                  
                  <div className="mt-auto pt-6 flex items-center justify-between border-t border-white/5">
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-bold uppercase tracking-wider">
                         <Clock size={12} /> 15m
                      </div>
                      <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-bold uppercase tracking-wider">
                         <Target size={12} /> M\u00fasculo \u03D5
                      </div>
                    </div>
                    
                    <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
                       <ChevronRight size={18} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-32 bg-surface-raised/20 rounded-[40px] border border-dashed border-white/5">
          <p className="text-text-muted font-bold uppercase tracking-widest text-xs">O Or\u00e1culo aguarda novos dados.</p>
          <button 
            onClick={() => { setSearch(''); }}
            className="mt-6 text-accent font-black uppercase tracking-widest text-[10px] hover:underline"
          >
            Limpar Pesquisa
          </button>
        </div>
      )}
    </div>
  );
};
