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
  if (isError || !perfil) return <div className="text-center py-20 text-text-muted">Perfil não encontrado ou privado.</div>;

  const initials = perfil.nome.charAt(0).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      {/* ── Header: Hero Identity ── */}
      <section className="relative overflow-hidden rounded-[32px] bg-surface-alt border border-white/5 p-8 md:p-12">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/10 to-transparent opacity-30" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <div className="h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-accent/20 p-1 shadow-2xl shadow-accent/10">
              <Avatar src={perfil.avatarUrl || undefined} fallback={initials} className="h-full w-full rounded-full object-cover text-4xl" />
            </div>
            <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-success border-4 border-surface-alt flex items-center justify-center text-white shadow-lg">
              <ShieldCheck size={20} />
            </div>
          </motion.div>

          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-black font-display tracking-tight text-text-primary">
                {perfil.nome}
              </h1>
              <p className="text-accent font-bold uppercase tracking-[0.2em] text-xs">
                {perfil.role === 'aluno' ? 'Talento Validado' : 'Mentor de Elite'}
              </p>
            </div>
            
            <p className="text-text-secondary text-lg max-w-xl leading-relaxed">
              {perfil.bio || 'Este talento ainda não definiu a sua biografia, mas os seus dados de telemetria falam por si.'}
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-medium text-text-muted">
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
        <Card className="md:col-span-2 p-8 bg-surface/40 backdrop-blur-xl border border-white/5 rounded-[32px] space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <Brain className="text-accent" size={24} />
              DNA Vocacional
            </h3>
            <Badge className="bg-accent/10 text-accent border-accent/20 px-3 py-1">Precisão 92%</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { label: 'Fluidez', val: '8.4', color: 'text-accent' },
              { label: 'Resiliência', val: '9.2', color: 'text-success' },
              { label: 'Foco', val: '7.8', color: 'text-blue-400' },
              { label: 'Técnico', val: '8.1', color: 'text-violet-400' },
            ].map(stat => (
              <div key={stat.label} className="text-center space-y-1">
                <p className="text-[10px] text-text-muted uppercase font-black tracking-widest">{stat.label}</p>
                <p className={`text-2xl font-mono font-black ${stat.color}`}>{stat.val}</p>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 italic text-text-secondary text-sm leading-relaxed">
            "Este perfil demonstra uma capacidade instintiva de resolução de problemas em ambientes de tecnologia, 
            com um tempo de reação 15% superior à média dos candidatos para Engenharia de Software."
          </div>
          
          {/* Endorsements Area */}
          <div className="pt-6 border-t border-white/5">
            <p className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-4">Validações de Mentores</p>
            <div className="flex flex-wrap gap-4">
              {[
                { name: 'Eng. Amadeu Silva', role: 'Mentor Tech', skill: 'Lógica' },
                { name: 'Dr. Firmino Gouveia', role: 'Estrategista', skill: 'Resiliência' },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/5 rounded-full pl-1 pr-4 py-1 border border-white/5">
                  <div className="h-6 w-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[10px] font-bold text-accent">
                    {m.name.charAt(5)}
                  </div>
                  <div className="text-[10px]">
                    <span className="font-bold text-text-primary">{m.name}</span>
                    <span className="text-text-muted mx-1">•</span>
                    <span className="text-success font-bold">Validou {m.skill}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Bento: Conquistas */}
        <Card className="p-8 bg-surface/40 backdrop-blur-xl border border-white/5 rounded-[32px] space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <Trophy className="text-accent" size={24} />
            Prestígio
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="aspect-square rounded-2xl bg-gradient-to-br from-accent/20 to-transparent border border-accent/10 flex items-center justify-center p-2 group cursor-pointer hover:border-accent/40 transition-all">
                <div className="w-full h-full rounded-xl bg-surface shadow-inner flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                  <Trophy size={20} />
                </div>
              </div>
            ))}
            <div className="aspect-square rounded-2xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-text-muted text-[10px] font-bold">
              +8
            </div>
          </div>
          <Button variant="ghost" className="w-full text-xs font-bold text-text-muted hover:text-text-primary">
            Ver todas as 13 conquistas →
          </Button>
        </Card>
      </div>

      {/* ── Projetos Showcase ── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-bold font-display tracking-tight text-text-primary text-2xl">Portfólio de Evidências</h3>
          <Link to="/app/projetos" className="text-xs font-bold text-accent hover:underline uppercase tracking-widest">Explorar Projetos →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2].map(i => (
            <Card key={i} className="group overflow-hidden rounded-[28px] bg-surface-alt border border-white/5 hover:border-accent/30 transition-all">
              <div className="aspect-video bg-gradient-to-br from-surface-raised to-background relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:scale-110 transition-transform duration-700">
                  <Brain size={80} />
                </div>
                <div className="absolute bottom-4 left-4">
                  <Badge className="bg-black/60 backdrop-blur-md border-white/10">Simulação Tipo 2</Badge>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <h4 className="font-bold text-text-primary group-hover:text-accent transition-colors">Diagnóstico de Redes Angolanas</h4>
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                  Projeto validado que demonstra perícia em infraestrutura crítica e protocolos de segurança.
                </p>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex -space-x-2">
                    {[1,2].map(j => <div key={j} className="h-6 w-6 rounded-full border-2 border-surface-alt bg-accent/20 flex items-center justify-center text-[8px] font-bold text-accent" />)}
                  </div>
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-tighter">Validado por 2 Mentores</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
