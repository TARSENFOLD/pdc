import { useQuery } from '@tanstack/react-query';
import { cursosApi } from '@/lib/api/cursos';
import { Spinner, Badge, Card, Button, EmptyState } from '@/components/ui';
import { GraduationCap, Award, ShieldCheck, Download, Share2, Zap, Lock } from 'lucide-react';
import type { InscricaoComCurso } from '@pdc/shared';
import { motion } from 'motion/react';

export function CertificadosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['estudante', 'certificados'],
    queryFn: () => cursosApi.getCertificados(),
  });

  const certificados = data?.data ?? [];

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-20 animate-in fade-in duration-1000">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Badge variant="info" className="bg-accent/10 text-accent border-accent/20 mb-3 px-3 py-1 uppercase tracking-widest text-[9px] font-black">Merit Certification</Badge>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter font-display">
            Os Meus <span className="text-accent">Certificados</span>
          </h1>
          <p className="text-text-secondary mt-2 max-w-lg leading-relaxed text-sm">
            Documentos oficiais de proficiência validados por telemetria comportamento e mérito académico.
          </p>
        </div>
      </header>

      {certificados.length === 0 ? (
        <section className="space-y-12">
           {/* Aspiracional Empty State */}
           <EmptyState
             icon={GraduationCap}
             title="O teu Portfólio de Mérito está vazio"
             description="Conclui simulações avançadas e cursos de elite para desbloqueares as tuas primeiras certificações de autoridade."
             ctaLabel="Ver Simulações Disponíveis"
             ctaTo="/app/simulacoes"
           />

           {/* Skeletons of Future Achievements (Aspirational) */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-30 grayscale filter blur-[1px] pointer-events-none select-none">
              {[1, 2, 3].map(i => (
                <Card key={i} className="p-8 border-dashed border-white/10 bg-white/[0.01] relative flex flex-col items-center text-center">
                  <div className="absolute top-4 right-4 text-accent/40"><Lock size={14} /></div>
                  <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                     <Award size={32} className="text-text-muted" />
                  </div>
                  <div className="h-4 w-32 bg-white/5 rounded-full mb-3" />
                  <div className="h-3 w-48 bg-white/5 rounded-full" />
                </Card>
              ))}
           </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {certificados.map((cert: InscricaoComCurso, idx) => (
            <motion.div
              key={cert.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="group relative overflow-hidden bg-surface-alt border-white/5 hover:border-accent/30 transition-all shadow-2xl p-0">
                 {/* Certificate Aesthetic Header */}
                 <div className="h-2 w-full bg-gradient-to-r from-accent/20 via-accent to-accent/20" />
                 
                 <div className="p-8 space-y-6">
                    <div className="flex justify-between items-start">
                       <div className="p-3 bg-accent/5 rounded-2xl text-accent group-hover:scale-110 transition-transform">
                          <Award size={32} />
                       </div>
                       <Badge className="bg-success/10 text-success border-success/20 uppercase text-[8px] font-black tracking-widest">Verificado</Badge>
                    </div>

                    <div className="space-y-1">
                       <h3 className="text-xl font-bold text-text-primary leading-tight tracking-tight group-hover:text-accent transition-colors">
                         {cert.curso?.titulo ?? 'Certificação de Mérito'}
                       </h3>
                       <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">
                         Emitido pelo PDC decision engine
                       </p>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full bg-success" />
                       <span className="text-[10px] font-mono font-bold text-text-secondary uppercase">
                         Concluído em {new Date(cert.dataConclusao ?? cert.dataInscricao).toLocaleDateString('pt-AO')}
                       </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4">
                       <Button variant="secondary" size="sm" className="bg-white/5 border-white/5 text-[10px] font-black uppercase tracking-widest">
                         <Download size={12} className="mr-2" /> PDF
                       </Button>
                       <Button variant="secondary" size="sm" className="bg-white/5 border-white/5 text-[10px] font-black uppercase tracking-widest">
                         <Share2 size={12} className="mr-2" /> Partilhar
                       </Button>
                    </div>
                 </div>

                 {/* Security Seal Detail */}
                 <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <ShieldCheck size={120} className="text-text-primary" />
                 </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <footer className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
          <Zap size={14} className="text-accent" />
          Certificação imutável registada na Blockchain de Mérito PDC (W5)
        </p>
        <div className="flex gap-4">
           <button className="text-[10px] font-black text-text-muted uppercase tracking-widest hover:text-text-primary transition-all">Verificabilidade Pública</button>
           <button className="text-[10px] font-black text-text-muted uppercase tracking-widest hover:text-text-primary transition-all">Termos de Emissão</button>
        </div>
      </footer>
    </div>
  );
}
