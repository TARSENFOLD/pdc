import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { simulacoesApi } from '../../lib/api/simulacoes';
import { likeApi, bookmarkApi, ratingsApi } from '../../lib/api/interactions';
import type { Simulacao } from '@pdc/shared';
import { Card, Button, Spinner, Badge, LikeButton, BookmarkButton, RatingStars } from '../../components/ui';

export const SimulacaoDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [simulacao, setSimulacao] = useState<Simulacao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      simulacoesApi.getById(id)
        .then(res => { setSimulacao(res); })
        .catch((err: unknown) => { console.error('Erro ao carregar simulação:', err); })
        .finally(() => { setLoading(false); });
    }
  }, [id]);

  const { data: likeStatus } = useQuery({
    queryKey: ['simulacao', id, 'likes'],
    queryFn: () => likeApi.getStatus('simulacao', id ?? ''),
    enabled: !!id,
  });

  const { data: ratingStats } = useQuery({
    queryKey: ['simulacao', id, 'ratings'],
    queryFn: () => ratingsApi.getStats('simulacao', id ?? ''),
    enabled: !!id,
  });

  const { data: bookmarks } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => bookmarkApi.list(),
  });
  const isBookmarked = bookmarks?.data.some(b => b.targetType === 'simulacao' && b.targetId === id) ?? false;


  const handleIniciar = async () => {
    if (!id) return;
    try {
      const tentativa = await simulacoesApi.iniciarTentativa({ simulacaoId: id });
      navigate(`/app/simulacoes/${id}/play?tentativaId=${tentativa.id}`);
    } catch (err) {
      console.error('Erro ao iniciar tentativa:', err);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Spinner /></div>;
  if (!simulacao) return (
    <div className="text-center py-20">
      <p className="text-gray-500 mb-4">Simulação não encontrada.</p>
      <Link to="/app/simulacoes">
        <Button variant="secondary">Voltar para lista</Button>
      </Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center gap-2">
        <Link to="/app/simulacoes">
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
            ← Voltar para simulações
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1">Simulação Experimental</Badge>
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Tipo {simulacao.tipo}</Badge>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h1 className="text-4xl font-black tracking-tight">{simulacao.titulo}</h1>
              <div className="flex items-center gap-2 shrink-0">
                <RatingStars targetType="simulacao" targetId={id ?? ''} stats={ratingStats} />
                <div className="w-px h-6 bg-border mx-2"></div>
                <LikeButton targetType="simulacao" targetId={id ?? ''} initialCount={likeStatus?.count} initialLiked={likeStatus?.liked} />
                <BookmarkButton targetType="simulacao" targetId={id ?? ''} initialBookmarked={isBookmarked} />
              </div>
            </div>
            <div className="prose prose-blue max-w-none">
              <p className="text-xl text-gray-600 leading-relaxed">{simulacao.descricao}</p>
            </div>
          </div>

          <Card className="p-8 bg-blue-50 border-blue-100 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-blue-900">O que vais aprender:</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-blue-800">
              <li className="flex items-center gap-2">
                <span className="text-blue-500 text-xl">✓</span> Contexto real do dia-a-dia
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500 text-xl">✓</span> Tomada de decisão crítica
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500 text-xl">✓</span> Feedback vocacional imediato
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500 text-xl">✓</span> Pontuação para o teu perfil
              </li>
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 sticky top-24 border-2">
            {simulacao.capaUrl && (
              <img 
                src={simulacao.capaUrl} 
                alt={simulacao.titulo} 
                className="w-full aspect-square object-cover rounded-lg mb-6 shadow-md" 
              />
            )}
            
            <div className="space-y-4">
              <div className="flex justify-between text-sm py-2 border-b">
                <span className="text-gray-500">Duração estimada</span>
                <span className="font-bold">~15-20 min</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b">
                <span className="text-gray-500">Dificuldade</span>
                <span className="font-bold">Intermédio</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b">
                <span className="text-gray-500">Recompensas</span>
                <span className="font-bold text-green-600">+100 XP</span>
              </div>
              
              <Button onClick={() => { void handleIniciar(); }} className="w-full py-6 text-lg font-bold shadow-lg shadow-blue-200">
                Começar Agora
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
