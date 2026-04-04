import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { simulacoesApi } from '../../lib/api/simulacoes';
import { telemetriaService } from '../../lib/telemetria/telemetria.service';
import { Card, Button, Badge } from '../../components/ui';

interface Props {
  simulacao: any;
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
    telemetriaService.registarEvento('simulacao.iniciada', { 
      simulacaoId: simulacao.id, 
      tentativaId, 
      tipo: 1 
    });
  }, [simulacao.id, tentativaId]);

  const handleStartVideo = () => {
    setVideoStarted(true);
    telemetriaService.registarEvento('video.assistido', { 
      simulacaoId: simulacao.id, 
      estado: 'iniciado' 
    });
  };

  const handleCheck = (item: keyof typeof checklist) => {
    const newVal = !checklist[item];
    setChecklist(prev => ({ ...prev, [item]: newVal }));
    telemetriaService.registarEvento('checklist.item_marcado', { 
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
        score,
        metadata: { checklist, tipo: 1 }
      });
      telemetriaService.registarEvento('simulacao.concluida', { 
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
      <div className="lg:col-span-2 space-y-6">
        <Card className="overflow-hidden bg-black aspect-video relative group border-0 shadow-2xl">
          {!videoStarted ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/80 to-transparent">
              <Button 
                size="lg" 
                onClick={handleStartVideo}
                className="rounded-full w-20 h-20 flex items-center justify-center p-0 bg-white text-black hover:scale-110 transition-transform"
              >
                <span className="text-3xl ml-1">▶</span>
              </Button>
              <p className="mt-4 text-white font-medium">Assistir Introdução do Caso</p>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white bg-slate-900">
              <div className="text-center space-y-4">
                <div className="animate-pulse text-6xl">🎬</div>
                <p className="text-lg text-slate-400">A reproduzir conteúdo da simulação...</p>
                <Button variant="outline" size="sm" onClick={() => setVideoStarted(false)}>Reiniciar</Button>
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Resumo da Tarefa</h2>
          <p className="text-gray-600 leading-relaxed">
            Analisa cuidadosamente o vídeo acima e identifica os pontos críticos da situação apresentada. 
            Utiliza a checklist lateral para guiar a tua análise e submete a tua auto-avaliação final.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="p-6 space-y-6 border-2 border-slate-100">
          <div className="space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
              Análise de Competências
            </h3>
            <div className="space-y-3">
              {(Object.keys(checklist) as Array<keyof typeof checklist>).map((item) => (
                <label 
                  key={item} 
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    checklist[item] ? 'border-green-200 bg-green-50' : 'border-slate-50 bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                    checked={checklist[item]} 
                    onChange={() => handleCheck(item)}
                  />
                  <span className={`text-sm font-medium capitalize ${checklist[item] ? 'text-green-800' : 'text-slate-700'}`}>
                    {item} da situação
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
              Auto-avaliação
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-500">Nível de confiança</span>
                <Badge variant="secondary" className="text-orange-700 bg-orange-50">{score}/10</Badge>
              </div>
              <input 
                type="range" 
                min="0" 
                max="10" 
                value={score} 
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Iniciante</span>
                <span>Especialista</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSubmit} 
            className="w-full py-6 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100"
            disabled={!Object.values(checklist).some(v => v)}
          >
            Concluir Simulação
          </Button>
        </Card>
      </div>
    </div>
  );
};
