import { useEffect, useState } from 'react';
import { http } from '../../lib/api/http';
import type { RelatorioVocacional as IRelatorioVocacional } from '@pdc/shared';
import { Card, Spinner, Badge, Button } from '../../components/ui';
import { Link } from 'react-router-dom';

export const RelatorioVocacional = () => {
  const [data, setData] = useState<IRelatorioVocacional | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http.get<IRelatorioVocacional>('/vocacional/perfil')
      .then(res => { setData(res); })
      .catch((err: unknown) => { console.error('Erro ao carregar perfil vocacional:', err); })
      .finally(() => { setLoading(false); });
  }, []);

  if (loading) return <div className="flex justify-center p-20"><Spinner /></div>;
  if (!data || data.perfil.scoreGlobal === 0) return (
    <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
      <div className="text-6xl mb-4">🔬</div>
      <h2 className="text-2xl font-bold text-slate-900">Perfil Vocacional em Análise</h2>
      <p className="text-slate-500 leading-relaxed">
        Ainda não temos dados suficientes para gerar o teu relatório completo. 
        Realiza as simulações práticas para que possamos analisar as tuas competências e sugerir o melhor caminho.
      </p>
      <Link to="/app/simulacoes">
        <Button size="lg" variant="primary">Explorar Simulações Agora</Button>
      </Link>
    </div>
  );

  const { perfil, recomendacoes } = data;

  const dims = [
    { label: 'Aptidão Técnica', value: perfil.aptidao, color: 'bg-blue-500', desc: 'Capacidade de execução e qualidade dos resultados.' },
    { label: 'Consistência', value: perfil.consistencia, color: 'bg-emerald-500', desc: 'Estabilidade do desempenho ao longo do tempo.' },
    { label: 'Dedicação', value: perfil.dedicacao, color: 'bg-orange-500', desc: 'Volume de trabalho e persistência nas tarefas.' },
    { label: 'Diversidade', value: perfil.diversidade, color: 'bg-violet-500', desc: 'Capacidade de adaptação a diferentes contextos.' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-top-4 duration-1000">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tighter text-slate-900">O Teu DNA Profissional</h1>
        <p className="text-slate-500 text-lg">Baseado na tua performance real em ambientes simulados.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3 space-y-10">
          <Card className="p-8 border-2 border-slate-100 shadow-xl shadow-slate-200/50">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <span className="p-2 bg-blue-50 rounded-lg text-blue-600">📊</span>
                Dimensões de Performance
              </h3>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-widest">Score Global</span>
                <span className="text-3xl font-black text-blue-600">{perfil.scoreGlobal}/10</span>
              </div>
            </div>

            <div className="space-y-10">
              {dims.map(dim => (
                <div key={dim.label} className="group">
                  <div className="flex justify-between items-end mb-3">
                    <div className="space-y-0.5">
                      <span className="text-sm font-black text-slate-800 uppercase tracking-wide">{dim.label}</span>
                      <p className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors">{dim.desc}</p>
                    </div>
                    <span className="text-lg font-mono font-black text-slate-900">{dim.value}<span className="text-slate-300 text-xs ml-0.5">/10</span></span>
                  </div>
                  <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden p-1">
                    <div 
                      className={`${dim.color} h-full rounded-full transition-all duration-1000 delay-300 ease-out shadow-sm`} 
                      style={{ width: `${String(dim.value * 10)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-8 bg-slate-900 text-white border-0 shadow-2xl">
            <h4 className="text-xl font-bold mb-4">Análise do Consultor IA</h4>
            <p className="text-slate-300 leading-relaxed italic">
              "Demonstras uma forte tendência para áreas que exigem {perfil.aptidao > 7 ? 'elevada precisão técnica' : 'grande capacidade de exploração'}. 
              A tua {perfil.consistencia > 6 ? 'estabilidade' : 'flexibilidade'} sugere que terias sucesso em ambientes 
              {perfil.diversidade > 5 ? ' dinâmicos e multidisciplinares.' : ' especializados e de alta profundidade.'}"
            </p>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <h3 className="text-2xl font-bold flex items-center gap-3 px-2">
            <span className="p-2 bg-emerald-50 rounded-lg text-emerald-600">🎯</span>
            Recomendações Elite
          </h3>
          <div className="space-y-6">
            {recomendacoes.map((rec, index) => (
              <Card 
                key={rec.cursoId} 
                className={`p-6 border-2 transition-all hover:scale-[1.02] cursor-pointer group ${
                  index === 0 ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <span className="text-2xl">🎓</span>
                  </div>
                  <Badge className={index === 0 ? 'bg-emerald-500' : 'bg-slate-700'}>
                    {rec.matchPercentagem}% Match
                  </Badge>
                </div>
                <h4 className="text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors mb-2">
                  {rec.titulo}
                </h4>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  {rec.motivo}
                </p>
                <Link to={`/app/cursos/${rec.cursoId}`}>
                  <Button variant={index === 0 ? 'primary' : 'secondary'} className="w-full font-bold">
                    Ver Programa do Curso
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
          
          <div className="p-6 bg-blue-50 rounded-2xl border-2 border-dashed border-blue-100 text-center">
            <p className="text-blue-700 font-bold text-sm mb-2">Queres mais precisão?</p>
            <p className="text-blue-600/70 text-xs mb-4">Quanto mais simulações fizeres, melhor será o teu perfil.</p>
            <Link to="/app/simulacoes">
              <Button size="sm" variant="secondary">
                Fazer nova simulação
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
