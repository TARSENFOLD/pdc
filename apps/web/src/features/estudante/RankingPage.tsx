import { useQuery } from '@tanstack/react-query';
import { Card, Spinner, Avatar, Badge, Button } from '@/components/ui';
import { http } from '@/lib/api/http';
import { Zap, Trophy, Star, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

interface RankingUser {
  id: string;
  nome: string;
  avatarUrl?: string;
  xp: number;
  reputacao: number;
  role: string;
}

export function RankingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['estudante', 'ranking'],
    queryFn: () => http.get<{ data: RankingUser[] }>('/estudante/ranking'),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  const talentos = data?.data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-20 animate-in fade-in duration-1000">
      <header className="text-center space-y-4">
        <Badge variant="info" className="bg-accent/10 text-accent border-accent/20 px-3 py-1 uppercase tracking-widest text-[9px] font-black">Global Leaderboard</Badge>
        <h1 className="text-5xl font-black text-ink-primary tracking-tighter font-display">
          Elite do <span className="text-accent">Mérito</span>
        </h1>
        <p className="text-ink-secondary max-w-lg mx-auto leading-relaxed text-sm">
          Os talentos que estão a moldar o futuro de Angola através do rigor técnico e resiliência.
        </p>
      </header>

      <div className="space-y-3">
        {talentos.map((t, idx) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="p-5 flex items-center justify-between bg-elevated border-white/5 hover:border-accent/20 transition-all group">
               <div className="flex items-center gap-6">
                  <span className="font-mono font-black text-2xl text-ink-tertiary group-hover:text-accent transition-colors w-8">
                    {(idx + 1).toString().padStart(2, '0')}
                  </span>
                  <Avatar src={t.avatarUrl} fallback={t.nome[0]} className="h-12 w-12 border-2 border-white/10" />
                  <div>
                    <h3 className="font-bold text-ink-primary group-hover:text-accent transition-colors">{t.nome}</h3>
                    <div className="flex items-center gap-3 mt-1">
                       <span className="text-[10px] text-ink-tertiary font-bold uppercase tracking-widest flex items-center gap-1">
                          <Zap size={10} className="text-accent" /> {t.xp.toLocaleString()} XP
                       </span>
                       <span className="text-[10px] text-ink-tertiary font-bold uppercase tracking-widest flex items-center gap-1">
                          <Star size={10} className="text-accent-trust" /> {t.reputacao} Rep
                       </span>
                    </div>
                  </div>
               </div>
               <Link to={`/app/perfil/${t.id}`}>
                  <Button variant="ghost" size="md" className="rounded-xl border border-white/5 opacity-0 group-hover:opacity-100 transition-all">
                     Ver Perfil <ArrowUpRight size={14} className="ml-2" />
                  </Button>
               </Link>
            </Card>
          </motion.div>
        ))}
      </div>

      <footer className="pt-10 flex flex-col items-center gap-6 border-t border-white/5">
         <div className="flex items-center gap-2 text-[10px] font-black text-ink-tertiary uppercase tracking-[0.3em]">
            <Trophy size={14} className="text-accent" /> Actualizado em tempo real pelo Oráculo
         </div>
      </footer>
    </div>
  );
}

// Replaced local Button with the standard one from '@/components/ui'
