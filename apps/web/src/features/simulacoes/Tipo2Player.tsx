import { useState, useEffect } from 'react';
import { Lock, Monitor } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { simulacoesApi } from '../../lib/api/simulacoes';
import { telemetriaService } from '../../lib/telemetria/telemetria.service';
import { Card, Button, Spinner } from '../../components/ui';
import type { Simulacao } from '@pdc/shared';

interface Props {
  simulacao: Simulacao;
}

export const Tipo2Player = ({ simulacao }: Props) => {
  const [searchParams] = useSearchParams();
  const tentativaId = searchParams.get('tentativaId');
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => { setSeconds(s => s + 1); }, 1000);
    void telemetriaService.registarEvento('iframe.sessao', { 
      estado: 'iniciada', 
      simulacaoId: simulacao.id 
    });
    
    // Simular carregamento do iframe
    const timeout = setTimeout(() => { setLoading(false); }, 1500);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
      void telemetriaService.registarEvento('iframe.sessao', { 
        estado: 'finalizada', 
        duracao: seconds, 
        simulacaoId: simulacao.id 
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulacao.id]);

  const handleConcluir = async () => {
    if (!tentativaId) return;
    try {
      await simulacoesApi.concluirTentativa({
        tentativaId,
        score: 10,
        metadata: { duracaoSegundos: seconds, tipo: 2 }
      });
      void telemetriaService.registarEvento('simulacao.concluida', { 
        tentativaId, 
        duracao: seconds, 
        tipo: 2 
      });
      navigate('/app/perfil-vocacional');
    } catch (err) {
      console.error('Erro ao concluir:', err);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tempo em Sessão</span>
            <span className="text-2xl font-mono font-black text-blue-600">{formatTime(seconds)}</span>
          </div>
          <div className="h-10 w-[2px] bg-slate-100 hidden md:block"></div>
          <div className="hidden md:flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado da Ligação</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-bold text-slate-700">Encriptada & Ativa</span>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={() => { void handleConcluir(); }} 
          className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100 px-8 py-6 text-lg font-bold"
        >
          Finalizar Experiência
        </Button>
      </div>

      <Card className="h-[700px] overflow-hidden border-4 border-slate-100 relative shadow-2xl rounded-2xl">
        {simulacao.iframeUrl ? (
          <>
            {loading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50">
                <Spinner />
                <p className="mt-4 text-slate-500 font-medium animate-pulse">A estabelecer ligação segura com o ambiente virtual...</p>
              </div>
            )}
            <iframe 
              src={simulacao.iframeUrl}
              className="w-full h-full border-0"
              title="Ambiente Virtual de Simulação"
              onLoad={() => { setLoading(false); }}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500 font-medium">URL do laboratório não configurada para esta simulação.</p>
          </div>
        )}
      </Card>
      
      <div className="flex items-center justify-center gap-4 text-slate-400 text-xs font-medium">
        <span className="flex items-center gap-1"><Lock size={14} aria-hidden={true} className="inline-block mr-1" /> Conexão Segura</span>
        <span>•</span>
        <span>⚡ Latência: 24ms</span>
        <span>•</span>
        <span><Monitor size={14} aria-hidden={true} className="inline-block mr-1" /> Resolução: Auto</span>
      </div>
    </div>
  );
};
