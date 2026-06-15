import { useState, useEffect } from 'react';
import { Clapperboard } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { simulacoesApi } from '../../lib/api/simulacoes';
import { telemetriaService } from '../../lib/telemetria/telemetria.service';
import { Card, Button, Badge } from '../../components/ui';
import type { Simulacao } from '@pdc/shared';

interface Props {
  simulacao: Simulacao;
}

export const Tipo1Player = ({ simulacao }: Props) => {
  const [searchParams] = useSearchParams();
  const tentativaId = searchParams.get('tentativaId');
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState({
    compreensao: false,
    identificacao: false,
    resolucao: false,
  });
  const [score, setScore] = useState(7);
  const [videoStarted, setVideoStarted] = useState(false);

  useEffect(() => {
    void telemetriaService.registarEvento('simulacao.iniciada', { 
      simulacaoId: simulacao.id, 
      tentativaId, 
      tipo: 1 
    });
  }, [simulacao.id, tentativaId]);

  const handleStartVideo = () => {
    setVideoStarted(true);
    void telemetriaService.registarEvento('video.assistido', { 
      simulacaoId: simulacao.id, 
      estado: 'iniciado' 
    });
  };

  const handleCheck = (item: keyof typeof checklist) => {
    const newVal = !checklist[item];
    setChecklist(prev => ({ ...prev, [item]: newVal }));
    void telemetriaService.registarEvento('checklist.item_marcado', { 
      item, 
      valor: newVal, 
      simulacaoId: simulacao.id 
    });
  };

  const handleSubmit = async () => {
    if (!tentativaId) return;
    try {
      await simulacoesApi.concluirTentativa({
        tentativaId,
        metadata: { checklist, tipo: 1, scoreSelf: score }
      });
      void telemetriaService.registarEvento('simulacao.concluida', { 
        tentativaId, 
        score, 
        tipo: 1 
      });
      navigate('/app/perfil-vocacional');
    } catch (err) {
      console.error('Erro ao concluir:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 animate-in fade-in duration-700 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card className="group relative aspect-video overflow-hidden border border-[var(--chrome-border)] bg-[var(--chrome-surface)] shadow-[var(--elevation-2)]">
          {!videoStarted ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--chrome-surface)]">
              <Button
                size="lg"
                onClick={handleStartVideo}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--ink-on-accent)] p-0 text-[var(--chrome-surface)] transition-opacity hover:opacity-90"
              >
                <span className="text-3xl ml-1">▶</span>
              </Button>
              <p className="mt-4 font-medium text-[var(--ink-on-accent)]">Assistir introdução do caso</p>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--chrome-surface)] text-[var(--ink-on-accent)]">
              {simulacao.conteudoUrl ? (
                <video 
                  src={simulacao.conteudoUrl} 
                  controls 
                  autoPlay 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center space-y-4">
                  <Clapperboard size={48} aria-hidden={true} className="animate-pulse text-ink-primary" />
                  <p className="text-lg text-[var(--ink-on-accent)] opacity-70">A reproduzir conteúdo da simulação...</p>
                  <Button variant="secondary" size="sm" onClick={() => { setVideoStarted(false); }}>Reiniciar</Button>
                </div>
              )}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-ink-primary">Resumo da tarefa</h2>
          <p className="leading-relaxed text-ink-secondary">
            Analisa cuidadosamente o vídeo acima e identifica os pontos críticos da situação apresentada. 
            Utiliza a checklist lateral para guiar a tua análise e submete a tua auto-avaliação final.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="space-y-6 border border-[var(--chrome-border)] bg-[var(--surface-elevated)] p-6">
          <div className="space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span className="h-6 w-1 bg-[var(--accent-terracotta)]"></span>
              Análise de competências
            </h3>
            <div className="space-y-3">
              {(Object.keys(checklist) as Array<keyof typeof checklist>).map((item) => (
                <label 
                  key={item} 
                  className={`flex cursor-pointer items-center gap-3 rounded-sm border p-3 transition-colors ${
                    checklist[item]
                      ? 'border-[var(--accent-success)] bg-[color-mix(in_srgb,var(--accent-success)_12%,transparent)]'
                      : 'border-[var(--chrome-border)] bg-[var(--surface-recessed)] hover:border-[var(--ink-tertiary)]'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    className="h-5 w-5 rounded-sm accent-[var(--accent-terracotta)] focus:ring-[var(--accent-terracotta)]"
                    checked={checklist[item]} 
                    onChange={() => { handleCheck(item); }}
                  />
                  <span className={`text-sm font-medium capitalize ${checklist[item] ? 'text-[var(--accent-success)]' : 'text-ink-secondary'}`}>
                    {item} da situação
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span className="h-6 w-1 bg-[var(--accent-terracotta)]"></span>
              Auto-avaliação
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-ink-secondary">Nível de confiança</span>
                <Badge variant="outline" className="border-accent/20 bg-accent/10 text-accent">{score}/10</Badge>
              </div>
              <input 
                type="range" 
                min="0" 
                max="10" 
                value={score} 
                onChange={(e) => { setScore(Number(e.target.value)); }}
                className="h-2 w-full cursor-pointer appearance-none rounded-sm bg-[var(--surface-recessed)] accent-[var(--accent-terracotta)]"
              />
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">
                <span>Iniciante</span>
                <span>Especialista</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => { void handleSubmit(); }} 
            className="asymmetric-a w-full bg-accent py-6 text-lg font-bold text-white hover:bg-[var(--accent-terracotta-soft)]"
            disabled={!Object.values(checklist).some(v => v)}
          >
            Concluir Simulação
          </Button>
        </Card>
      </div>
    </div>
  );
};
