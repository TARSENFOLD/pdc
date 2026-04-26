import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { simulacoesApi } from '../../lib/api/simulacoes';
import { likeApi, bookmarkApi, ratingsApi } from '../../lib/api/interactions';
import { Card, Button, Spinner, Badge, LikeButton, BookmarkButton, RatingStars } from '../../components/ui';

export const SimulacaoDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: simulacao, isLoading: loading } = useQuery({
    queryKey: ['simulacao', id],
    queryFn: () => simulacoesApi.getById(id ?? ''),
    enabled: !!id,
  });

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
      <p className="text-ink-tertiary mb-4">Simulação não encontrada.</p>
      <Link to="/app/simulacoes">
        <Button variant="secondary">Voltar para lista</Button>
      </Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center gap-2">
        <Link to="/app/simulacoes">
          <Button variant="ghost" size="sm" className="text-ink-tertiary hover:text-ink-primary">
            ← Voltar para simulações
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1">Simulação Experimental</Badge>
              <Badge variant="info">Tipo {simulacao.tipo}</Badge>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h1 className="text-4xl font-black tracking-tight font-display">{simulacao.titulo}</h1>
              <div className="flex items-center gap-2 shrink-0">
                <RatingStars targetType="simulacao" targetId={id ?? ''} stats={ratingStats} />
                <div className="w-px h-6 bg-border mx-2"></div>
                <LikeButton targetType="simulacao" targetId={id ?? ''} initialCount={likeStatus?.count} initialLiked={likeStatus?.liked} />
                <BookmarkButton targetType="simulacao" targetId={id ?? ''} initialBookmarked={isBookmarked} />
              </div>
            </div>
            <div className="prose max-w-none text-ink-secondary">
              <p className="text-xl leading-relaxed">{simulacao.descricao}</p>
            </div>
          </div>

          <div className="rounded-xl border border-ink-tertiary/10 bg-elevated p-8 space-y-4">
            <h3 className="text-lg font-bold text-ink-primary">O que vais aprender:</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-ink-secondary">
              <li className="flex items-center gap-2">
                <span className="text-accent text-xl">✓</span> Contexto real do dia-a-dia
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent text-xl">✓</span> Tomada de decisão crítica
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent text-xl">✓</span> Feedback vocacional imediato
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent text-xl">✓</span> Pontuação para o teu perfil
              </li>
            </ul>
          </div>
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
              <div className="flex justify-between text-sm py-2 border-b border-ink-tertiary/10">
                <span className="text-ink-secondary">Tipo</span>
                <span className="font-bold text-ink-primary">Tipo {String(simulacao.tipo)}</span>
              </div>
              {'area' in simulacao && (
                <div className="flex justify-between text-sm py-2 border-b border-ink-tertiary/10">
                  <span className="text-ink-secondary">Área</span>
                  <span className="font-bold text-ink-primary">{String((simulacao as Record<string, unknown>).area)}</span>
                </div>
              )}
              
              <Button onClick={() => { void handleIniciar(); }} className="w-full py-6 text-lg font-bold">
                Começar Agora
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
