import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, Avatar } from '@/components/ui';
import { FeedCardSkeleton } from '@/components/ui/Skeleton';
import { mensagensApi } from '@/lib/api/mensagens';
import { MessageSquare } from 'lucide-react';

interface ConversaInfo {
  id: string;
  interlocutorId: string;
  interlocutorNome: string;
  interlocutorFoto?: string;
  ultimaMensagem?: string;
  naoLidas: number;
  updatedAt: string;
}

export function QuickMessagesWidget() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['mensagens', 'conversas'],
    queryFn: () => mensagensApi.getConversas({ page: 1, pageSize: 5 }),
  });

  if (isLoading) {
    return (
      <Card className="bg-[var(--chrome-surface)] border-[var(--chrome-border)] rounded-sm p-4 space-y-4">
        <div className="h-4 w-24 bg-[var(--surface-elevated)] animate-pulse rounded" />
        <FeedCardSkeleton />
      </Card>
    );
  }

  const conversas = (data?.data ?? []) as unknown as ConversaInfo[];

  return (
    <Card className="bg-[var(--chrome-surface)] border-[var(--chrome-border)] rounded-sm p-0 overflow-hidden">
      <div className="bg-[var(--surface-elevated)] px-4 py-3 border-b border-[var(--chrome-border)] flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-[var(--ink-primary)] uppercase tracking-[0.12em] font-serif">
          {t('feed.mensagens', 'Mensagens Diretas')}
        </h3>
        <Link to="/app/mensagens" className="text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors">
          <MessageSquare size={14} />
        </Link>
      </div>

      {conversas.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-xs text-[var(--ink-secondary)]">
            {t('feed.semMensagens', 'Nenhuma mensagem recente.')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {conversas.map((conversa) => (
            <Link 
              key={conversa.id} 
              to={`/app/mensagens/${conversa.id}`}
              className="flex items-center gap-3 p-3 hover:bg-[var(--surface-elevated)] transition-colors border-b border-[var(--chrome-border)] last:border-b-0"
            >
              <Avatar 
                src={conversa.interlocutorFoto || undefined} 
                fallback={(conversa.interlocutorNome || 'U').substring(0, 2)} 
                className="h-8 w-8 shrink-0" 
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--ink-primary)] truncate">
                  {conversa.interlocutorNome}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
