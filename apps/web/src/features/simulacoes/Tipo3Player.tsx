import { useState, useEffect, useRef } from 'react';
import { Lock, Zap, Brain, ShieldAlert, ChevronRight, Activity, MousePointer2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { simulacoesApi } from '../../lib/api/simulacoes';
import { useTelemetry } from '@/hooks/useTelemetry';
import { Card, Button, Spinner } from '../../components/ui';
import type { Simulacao } from '@pdc/shared';

interface Props {
  simulacao: Simulacao;
}

/**
 * Tipo3Player — Shell Funcional (R2.T5)
 * Player para simulações de Alta Fidelidade (Tipo 3).
 * Implementa o ciclo de vida de telemetria canónico e derivação de score no BFF.
 */
export const Tipo3Player = ({ simulacao }: Props) => {
  const [searchParams] = useSearchParams();
  const tentativaId = searchParams.get('tentativaId');
  const navigate = useNavigate();
  const { track, flush } = useTelemetry();
  
  const [seconds, setSeconds] = useState(0);
  const [focusStability, setFocusStability] = useState(100);
  const [acoesRealizadas, setAcoes] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startTimestamp = useRef(Date.now());

  useEffect(() => {
    const timer = setInterval(() => { setSeconds(s => s + 1); }, 1000);
    
    // Evento Canónico 1: Iniciada
    track('simulacao.tipo3.iniciada', { 
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

  const registrarAcao = (tipoAcao: string) => {
    setAcoes(prev => prev + 1);
    // Evento Canónico 2: Ação
    track('simulacao.tipo3.acao', { 
      tipo: tipoAcao,
      timestamp: Date.now()
    });
  };

  const handleConcluir = async () => {
    if (!tentativaId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const duracao = Math.floor((Date.now() - startTimestamp.current) / 1000);
      
      // Concluir tentativa (Derivação no BFF — R2.T4)
      await simulacoesApi.concluirTentativa({
        tentativaId,
        metadata: { 
          duracaoSegundos: duracao, 
          focusStability,
          acoesCount: acoesRealizadas,
          tipo: 3,
          domainId: simulacao.area
        }
      });

      // Evento Canónico 3: Concluída
      track('simulacao.tipo3.concluida', { 
        tentativaId, 
        duracao,
        focusStability,
        totalAcoes: acoesRealizadas
      });

      // Aguarda mais 1 segundo para feedback visual emocional
      await new Promise((resolve) => setTimeout(resolve, 1000));
      navigate('/app/reputacao');
    } catch (err) {
      console.error('Erro ao concluir simulação Tipo 3:', err);
      setIsSubmitting(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-1000 h-[calc(100vh-120px)]">
      
      {/* HUD Superior */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
         <Card className="p-4 bg-surface-alt border-white/5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent">
               <Zap size={20} className="animate-pulse" />
            </div>
            <div>
               <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Tempo Decorrido</p>
               <p className="font-mono text-xl font-black text-text-primary">{formatTime(seconds)}</p>
            </div>
         </Card>

         <Card className="p-4 bg-surface-alt border-white/5 flex items-center gap-4">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${focusStability > 70 ? 'bg-success/5 text-success' : 'bg-error/5 text-error'}`}>
               <Brain size={20} />
            </div>
            <div>
               <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Estabilidade</p>
               <p className="font-mono text-xl font-black text-text-primary">{focusStability}%</p>
            </div>
         </Card>

         <Card className="p-4 bg-surface-alt border-white/5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
               <MousePointer2 size={20} />
            </div>
            <div>
               <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Ações Realizadas</p>
               <p className="font-mono text-xl font-black text-text-primary">{acoesRealizadas}</p>
            </div>
         </Card>

         <div className="flex items-center justify-end gap-4">
            <Button 
              onClick={() => { void handleConcluir(); }} 
              disabled={isSubmitting}
              className="h-14 px-8 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-xl shadow-accent/20"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="mr-2 text-white" /> Analisando Telemetria...
                </>
              ) : (
                <>
                  Concluir Simulação <ChevronRight size={16} className="ml-2" />
                </>
              )}
            </Button>
         </div>
      </div>

      {/* Área Principal (Shell) */}
      <Card className="flex-1 relative overflow-hidden bg-black border-2 border-white/5 rounded-[32px] shadow-2xl flex flex-col items-center justify-center p-8 text-center">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--color-accent)_0%,_transparent_70%)]" />
        
        {isSubmitting ? (
          <div className="z-10 max-w-md animate-in fade-in zoom-in duration-500">
            <div className="h-24 w-24 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center mx-auto mb-6">
               <Brain size={40} className="text-accent animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Processando Padrões</h2>
            <p className="text-text-muted text-sm mb-8">A calcular o teu desempenho biométrico e a enviar para a Engine de Reputação...</p>
          </div>
        ) : (
          <div className="z-10 max-w-md">
            <Activity size={48} className="text-accent mx-auto mb-6 animate-pulse" />
            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">{simulacao.titulo}</h2>
            <p className="text-text-muted text-sm mb-8">{simulacao.descricao}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <Button variant="ghost" onClick={() => { registrarAcao('analise'); }} className="border-white/10 text-white hover:bg-white/5 uppercase text-[10px] font-bold">
                Executar Análise
              </Button>
              <Button variant="ghost" onClick={() => { registrarAcao('decisao'); }} className="border-white/10 text-white hover:bg-white/5 uppercase text-[10px] font-bold">
                Tomar Decisão
              </Button>
            </div>
          </div>
        )}

        {/* HUD de Monitorização */}
        <div className="absolute bottom-6 left-6 flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${isSubmitting ? 'bg-accent animate-spin' : 'bg-success animate-ping'}`} />
          <span className={`font-mono text-[9px] font-bold uppercase tracking-widest ${isSubmitting ? 'text-accent' : 'text-success'}`}>
            {isSubmitting ? 'A Sincronizar com o Servidor Central' : 'Sincronização Neural Estável'}
          </span>
        </div>
      </Card>

      {/* Footer */}
      <footer className="flex items-center justify-between px-2">
         <div className="flex gap-6">
            <div className="flex items-center gap-2 text-[9px] font-bold text-text-muted uppercase tracking-widest">
               <Lock size={12} className="text-accent" /> Secure Link
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold text-text-muted uppercase tracking-widest">
               <ShieldAlert size={12} className="text-accent" /> Autoridade L3
            </div>
         </div>
         <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">
           Módulo de Simulação Alta Fidelidade :: v2.2
         </p>
      </footer>
    </div>
  );
};
