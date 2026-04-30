import { useAuth } from '@/lib/auth/AuthContext';
import { Link } from 'react-router-dom';
import { GlassCard } from '@/components/ui';
import { Zap, Building2, ChevronRight, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export function PatrocinadorDashboard() {
  const { user } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 md:p-10 space-y-10 max-w-5xl mx-auto"
    >
      <header>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest mb-4">
          <ShieldCheck size={12} /> Painel do Patrocinador
        </div>
        <h1 className="text-4xl font-black text-ink-primary tracking-tighter sm:text-5xl font-display">
          Bem-vindo, {user?.nome.split(' ')[0] ?? 'Patrocinador'}<span className="text-accent">.</span>
        </h1>
        <p className="text-ink-secondary mt-2 text-lg">
          Acompanha o ecossistema e descobre talentos.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link to="/app/feed">
          <GlassCard className="p-6 hover:border-accent/20 transition-all group h-full">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform">
              <Zap size={20} />
            </div>
            <h3 className="font-bold text-ink-primary group-hover:text-accent transition-colors">Feed de Mérito</h3>
            <p className="text-xs text-ink-tertiary mt-1 leading-relaxed">Vê o que se passa na comunidade educativa.</p>
            <div className="flex items-center text-[10px] font-black text-ink-tertiary uppercase tracking-widest mt-4 group-hover:text-accent transition-colors">
              Abrir <ChevronRight size={12} className="ml-1" />
            </div>
          </GlassCard>
        </Link>

        <Link to="/app/explorar">
          <GlassCard className="p-6 hover:border-accent/20 transition-all group h-full">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform">
              <Building2 size={20} />
            </div>
            <h3 className="font-bold text-ink-primary group-hover:text-accent transition-colors">Explorar Talentos</h3>
            <p className="text-xs text-ink-tertiary mt-1 leading-relaxed">Descobre conteúdo e profissionais em formação.</p>
            <div className="flex items-center text-[10px] font-black text-ink-tertiary uppercase tracking-widest mt-4 group-hover:text-accent transition-colors">
              Abrir <ChevronRight size={12} className="ml-1" />
            </div>
          </GlassCard>
        </Link>
      </div>
    </motion.div>
  );
}
