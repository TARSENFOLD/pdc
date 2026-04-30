import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { perfisApi } from '@/lib/api/perfis';
import { Card, Spinner, Avatar, Badge, Button } from '@/components/ui';
import { Brain, Trophy, Link2, MapPin, Globe, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export function PerfilShowcase() {
  const { id } = useParams<{ id: string }>();
  
  const { data: perfil, isLoading, isError } = useQuery({
    queryKey: ['perfil', 'publico', id],
    queryFn: () => id ? perfisApi.getById(id) : perfisApi.getMe(),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;
  if (isError || !perfil) return <div className="text-center py-20 text-ink-tertiary">Perfil não encontrado ou privado.</div>;

  const initials = perfil.nome.charAt(0).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      {/* ── Header: Hero Identity ── */}
      <section className="relative overflow-hidden rounded-[32px] bg-recessed border border-white/5 p-8 md:p-12">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/10 to-transparent opacity-30" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <div className="h-32 w-32 md:h-40 md:w-40 rounded-full p-1 shadow-2xl shadow-accent/10">
              <Avatar 
                src={perfil.avatarUrl || undefined} 
                fallback={initials} 
                tier={perfil.reputacaoTier}
                className="h-full w-full rounded-full object-cover text-4xl border-4" 
              />
            </div>
            <div className="absolute -bottom-2 -left-2 bg-accent text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-xl uppercase tracking-[0.2em] border-4 border-surface-alt animate-in zoom-in duration-700">
              {perfil.reputacaoTier}
            </div>
            <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-success border-4 border-surface-alt flex items-center justify-center text-white shadow-lg">
              <ShieldCheck size={20} />
            </div>
          </motion.div>

          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-black font-display tracking-tight text-ink-primary">
                {perfil.nome}
              </h1>
              <p className="text-accent font-bold uppercase tracking-[0.2em] text-xs">
                {perfil.role === 'estudante' ? 'Talento Validado' : 'Mentor de Elite'}
              </p>
            </div>
            
            <p className="text-ink-secondary text-lg max-w-xl leading-relaxed">
              {perfil.bio || 'Este talento ainda não definiu a sua biografia, mas os seus dados de telemetria falam por si.'}
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-medium text-ink-tertiary">
              {perfil.regiao && <div className="flex items-center gap-1.5"><MapPin size={14} /> {perfil.regiao}</div>}
              {perfil.website && <div className="flex items-center gap-1.5"><Globe size={14} /> {perfil.website}</div>}
              <div className="flex items-center gap-1.5"><Link2 size={14} /> Conectado com 14 instituições</div>
            </div>
          </div>

          <div className="flex flex-col gap-3 min-w-[200px]">
            <Button className="w-full bg-accent text-white font-bold h-12 rounded-2xl shadow-lg shadow-accent/20 hover:scale-[1.02] transition-transform border-none">
              Propor Vínculo
            </Button>
            <Button variant="ghost" className="w-full border border-white/10 rounded-2xl h-12">
              <ExternalLink size={16} className="mr-2" /> Partilhar DNA
            </Button>
          </div>
        </div>
      </section>

      {/* ── Grid: O Músculo Social ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Bento: DNA Score */}
        <Card className="md:col-span-2 p-8 bg-elevated/40 backdrop-blur-xl border border-white/5 rounded-[32px] space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <Brain className="text-accent" size={24} />
              DNA Vocacional
            </h3>
            <Badge className="bg-accent/10 text-accent border-accent/20 px-3 py-1">Em Processamento</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 opacity-50">
            {['Fluidez', 'Resiliência', 'Foco', 'Técnico'].map(label => (
              <div key={label} className="text-center space-y-2 animate-pulse">
                <div className="h-2 w-12 bg-ink-tertiary/20 rounded mx-auto" />
                <div className="h-6 w-8 bg-ink-tertiary/20 rounded mx-auto" />
              </div>
            ))}
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 italic text-ink-secondary text-sm leading-relaxed opacity-50">
            <div className="h-3 w-full bg-ink-tertiary/20 rounded mb-2 animate-pulse" />
            <div className="h-3 w-4/5 bg-ink-tertiary/20 rounded animate-pulse" />
          </div>
          
          {/* Endorsements Area */}
          <div className="pt-6 border-t border-white/5">
            <p className="text-[10px] text-ink-tertiary uppercase font-black tracking-widest mb-4">Validações de Mentores</p>
            <div className="text-sm text-ink-tertiary opacity-70">Sem validações disponíveis.</div>
          </div>
        </Card>

        {/* Bento: Conquistas */}
        <Card className="p-8 bg-elevated/40 backdrop-blur-xl border border-white/5 rounded-[32px] space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <Trophy className="text-accent" size={24} />
            Prestígio
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {perfil.conquistas.length > 0 ? (
              perfil.conquistas.map((c, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-gradient-to-br from-accent/20 to-transparent border border-accent/10 flex items-center justify-center p-2 group cursor-pointer hover:border-accent/40 transition-all" title={c.titulo}>
                  <div className="w-full h-full rounded-xl bg-elevated shadow-inner flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                    <Trophy size={20} />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-sm text-ink-tertiary">Nenhuma conquista ainda.</div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Projetos Showcase ── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-bold font-display tracking-tight text-ink-primary text-2xl">Portfólio de Evidências</h3>
          <Link to="/projetos" className="text-xs font-bold text-accent hover:underline uppercase tracking-widest">Explorar Projetos →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="col-span-full text-center py-10 border border-dashed border-white/10 rounded-[28px] text-ink-tertiary text-sm">
            Nenhum projeto público validado no momento.
          </div>
        </div>
      </section>
    </div>
  );
}
