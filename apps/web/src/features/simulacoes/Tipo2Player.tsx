import { useState, useEffect, useRef } from 'react';
import { Lock, Monitor, Zap, Brain, ShieldAlert, ChevronRight, Activity } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { simulacoesApi } from '../../lib/api/simulacoes';
import { useTelemetry } from '@/hooks/useTelemetry';
import { Card, Button, Spinner } from '../../components/ui';
import type { Simulacao } from '@pdc/shared';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  simulacao: Simulacao;
}

export const Tipo2Player = ({ simulacao }: Props) => {
  const [searchParams] = useSearchParams();
  const tentativaId = searchParams.get('tentativaId');
  const navigate = useNavigate();
  const { track, flush } = useTelemetry();
  
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [focusLost, setFocusStability] = useState(100);
  const startTimestamp = useRef(Date.now());

  useEffect(() => {
    const timer = setInterval(() => { setSeconds(s => s + 1); }, 1000);
    
    track('simulacao.tipo2.iniciada', { 
      simulacaoId: simulacao.id,
      tentativaId 
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setFocusStability(prev => Math.max(0, prev - 10));
        track('simulacao.foco.perdido', { timestamp: Date.now() });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      void flush();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulacao.id, tentativaId, track]);

  const handleConcluir = async () => {
    if (!tentativaId) return;
    try {
      const duracao = Math.floor((Date.now() - startTimestamp.current) / 1000);
      
      await simulacoesApi.concluirTentativa({
        tentativaId,
        // Score agora é calculado pelo BFF a partir do metadata (R2.T4)
        metadata: { 
          duracaoSegundos: duracao, 
          focusStability: focusLost,
          tipo: 2,
          domainId: simulacao.area
        }
      });

      track('simulacao.tipo2.concluida', { 
        tentativaId, 
        duracao,
        focusStability: focusLost
      });

      navigate('/app/reputacao');
    } catch (err) {
      console.error('Erro ao concluir missão:', err);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-1000 h-[calc(100vh-120px)]">
      
      {/* ── Top HUD: Operational Control ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
         <Card className="p-4 bg-surface-alt border-white/5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent">
               <Zap size={20} className="animate-pulse" />
            </div>
            <div>
               <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Tempo de Missão</p>
               <p className="font-mono text-xl font-black text-text-primary">{formatTime(seconds)}</p>
            </div>
         </Card>

         <Card className="p-4 bg-surface-alt border-white/5 flex items-center gap-4">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${focusLost > 70 ? 'bg-success/5 text-success' : 'bg-error/5 text-error'}`}>
               <Brain size={20} />
            </div>
            <div>
               <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Estabilidade de Foco</p>
               <p className="font-mono text-xl font-black text-text-primary">{focusLost}%</p>
            </div>
         </Card>

         <div className="md:col-span-2 flex items-center justify-end gap-4">
            <div className="text-right hidden sm:block">
               <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Estado da Ligação</p>
               <p className="text-xs font-bold text-success flex items-center justify-end gap-1">
                 <ShieldAlert size={12} /> Criptografia de Elite Ativa
               </p>
            </div>
            <Button 
              onClick={() => { void handleConcluir(); }} 
              className="h-14 px-8 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-xl shadow-accent/20"
            >
              Finalizar Missão <ChevronRight size={16} className="ml-2" />
            </Button>
         </div>
      </div>

      {/* ── Main Cockpit: The Iframe HUD ── */}
      <Card className="flex-1 relative overflow-hidden bg-black border-2 border-white/5 rounded-[32px] shadow-2xl">
        
        {/* HUD Elements Over Iframe */}
        <div className="absolute inset-0 pointer-events-none z-10 border-[20px] border-black/10">
           <div className="absolute top-6 left-6 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-accent animate-ping" />
              <span className="font-mono text-[10px] font-bold text-accent uppercase tracking-tighter">L2 Telemetry Feed :: Live</span>
           </div>
           
           <div className="absolute bottom-6 right-6">
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                 <Activity size={14} className="text-accent" />
                 <span className="font-mono text-[9px] font-bold text-white tracking-widest uppercase">Motor $\phi$ em Auditoria</span>
              </div>
           </div>
        </div>

        {simulacao.iframeUrl ? (
          <>
            <AnimatePresence>
              {loading && (
                <motion.div 
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background"
                >
                  <Spinner size="lg" />
                  <p className="mt-6 text-[10px] font-black text-accent uppercase tracking-[0.3em] animate-pulse">
                    A estabelecer túnel de dados soberano...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <iframe 
              src={simulacao.iframeUrl}
              className="w-full h-full border-0 grayscale hover:grayscale-0 transition-all duration-700 opacity-80 hover:opacity-100"
              title="Operational Environment"
              onLoad={() => { setLoading(false); }}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <Monitor size={48} className="text-text-muted opacity-20" />
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Aguardando sinal do laboratório...</p>
          </div>
        )}
      </Card>

      {/* ── Footer Stats ── */}
      <footer className="flex items-center justify-between px-2">
         <div className="flex gap-6">
            <div className="flex items-center gap-2 text-[9px] font-bold text-text-muted uppercase tracking-widest">
               <Lock size={12} className="text-accent" /> Canal SSL/TLS 1.3
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold text-text-muted uppercase tracking-widest">
               <Zap size={12} className="text-accent" /> Latência: 18ms (Edge)
            </div>
         </div>
         <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">
           Sistema v2.2 :: Autoridade de Diagnóstico de Mérito
         </p>
      </footer>
    </div>
  );
};
