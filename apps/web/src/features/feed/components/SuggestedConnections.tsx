import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, Avatar } from '@/components/ui';
import { FeedCardSkeleton } from '@/components/ui/Skeleton';
import { vinculosApi } from '@/lib/api/vinculos';
import { UserPlus, Compass } from 'lucide-react';
import { toast } from '@/hooks/useToast';

export function SuggestedConnections() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['vinculos', 'sugestoes'],
    queryFn: vinculosApi.sugestoes,
  });
  const connectMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      vinculosApi.criar(id, role === 'mentor' ? 'student-mentor' : 'student-student'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vinculos'] });
      toast({ title: 'Pedido enviado', description: 'O pedido de vínculo foi enviado.', variant: 'success' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Não foi possível vincular',
        description: error instanceof Error ? error.message : 'Tenta novamente.',
        variant: 'error',
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-[var(--chrome-surface)] border-[var(--chrome-border)] rounded-sm p-4 space-y-4">
        <div className="h-4 w-32 bg-[var(--surface-elevated)] animate-pulse rounded" />
        <FeedCardSkeleton />
      </Card>
    );
  }

  const sugestoes = data?.data ?? [];

  return (
    <Card className="bg-[var(--chrome-surface)] border-[var(--chrome-border)] rounded-sm p-4">
      <h3 className="text-[11px] font-bold text-[var(--ink-tertiary)] uppercase tracking-[0.12em] mb-4">
        {t('feed.sugestoesVinculo', 'Sugestões de Vínculo')}
      </h3>

      {sugestoes.length === 0 ? (
        <div className="text-center py-4 space-y-3">
          <div className="mx-auto w-10 h-10 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center text-[var(--ink-tertiary)] mb-2">
            <Compass size={18} />
          </div>
          <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
            {t('feed.semSugestoes', 'O teu mapa de conexões cresce conforme exploras o ecossistema.')}
          </p>
          <Link 
            to="/app/vinculos" 
            className="inline-flex items-center gap-2 text-[11px] font-semibold text-[var(--accent-terracotta)] hover:text-[var(--accent-terracotta-soft)] transition-colors mt-2 uppercase tracking-wider"
          >
            {t('feed.expandNetwork', 'Aumentar Rede')} →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sugestoes.map((perfil) => (
            <div key={perfil.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar 
                  src={perfil.avatarUrl || undefined} 
                  fallback={perfil.nome.substring(0, 2)} 
                  className="h-8 w-8 border border-[var(--chrome-border)] shrink-0" 
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--ink-primary)] truncate">
                    {perfil.nome}
                  </p>
                  <p className="text-[10px] text-[var(--ink-tertiary)] truncate capitalize">
                    {perfil.role}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { connectMutation.mutate({ id: perfil.id, role: perfil.role }); }}
                disabled={connectMutation.isPending}
                className="shrink-0 ml-2 w-7 h-7 flex items-center justify-center rounded-sm text-[var(--ink-tertiary)] hover:text-[var(--accent-terracotta)] hover:bg-[var(--surface-elevated)] transition-colors"
                title={t('common.conectar', 'Conectar')}
              >
                <UserPlus size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
