import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discussionsApi, type Discussion, type DiscussionReply } from '../../lib/api/discussions';
import { useAuth } from '../../lib/auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

interface Props {
  discussion: Discussion;
  isMentorOrAdmin?: boolean;
  onBack: () => void;
  onPin: (pinned: boolean) => void;
  onResolve: (resolved: boolean) => void;
}

export function DiscussionThread({ discussion, isMentorOrAdmin, onBack, onPin, onResolve }: Props) {
  const { user } = useAuth();
  const discussionId = String(discussion.id);

  const { data, isLoading } = useQuery({
    queryKey: ['discussion-replies', discussionId],
    queryFn: () => discussionsApi.getReplies(discussionId),
  });

  const replies = data?.data ?? [];

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => { onBack(); }}>
          ← Voltar
        </Button>
        {isMentorOrAdmin && (
          <>
            <Button size="sm" variant="secondary" onClick={() => { onPin(!discussion.pinned); }}>
              {discussion.pinned ? 'Desafixar' : 'Fixar'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { onResolve(!discussion.resolved); }}>
              {discussion.resolved ? 'Reabrir' : 'Resolver'}
            </Button>
          </>
        )}
      </div>

      <div className="rounded-lg border border-ink-tertiary/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          {discussion.pinned && <Badge variant="warning">Fixado</Badge>}
          {discussion.resolved && <Badge variant="success">Resolvido</Badge>}
        </div>
        <h2 className="text-xl font-bold text-ink-primary">{discussion.titulo}</h2>
        <p className="mt-2 text-ink-secondary whitespace-pre-wrap">{discussion.corpo}</p>
        <p className="mt-3 text-xs text-ink-tertiary">
          {new Date(discussion.createdAt).toLocaleDateString('pt-PT')}
        </p>
      </div>

      <h3 className="text-sm font-semibold text-ink-tertiary uppercase tracking-wider">
        Respostas {replies.length > 0 && `(${replies.length.toString()})`}
      </h3>

      {isLoading ? (
        <p className="py-4 text-center text-ink-tertiary">A carregar respostas...</p>
      ) : replies.length === 0 ? (
        <p className="py-4 text-center text-ink-tertiary">Ainda não há respostas.</p>
      ) : (
        <ReplyTree replies={replies} discussionId={discussionId} />
      )}

      {user && (
        <ReplyForm discussionId={discussionId} />
      )}
    </div>
  );
}

function ReplyTree({ replies, discussionId }: { replies: DiscussionReply[]; discussionId: string }) {
  const topLevel = replies.filter((r) => !r.pai);
  const childrenMap = new Map<number, DiscussionReply[]>();

  for (const r of replies) {
    if (r.pai) {
      const parentId = r.pai.id;
      const children = childrenMap.get(parentId) ?? [];
      children.push(r);
      childrenMap.set(parentId, children);
    }
  }

  return (
    <div className="space-y-3">
      {topLevel.map((r) => (
        <ReplyNode
          key={r.id.toString()}
          reply={r}
          childrenMap={childrenMap}
          depth={0}
          discussionId={discussionId}
        />
      ))}
    </div>
  );
}

function ReplyNode({
  reply,
  childrenMap,
  depth,
  discussionId,
}: {
  reply: DiscussionReply;
  childrenMap: Map<number, DiscussionReply[]>;
  depth: number;
  discussionId: string;
}) {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const children = childrenMap.get(reply.id) ?? [];
  const canReply = depth < 2;

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-ink-tertiary/10 pl-4' : ''}>
      <div className="rounded-lg border border-ink-tertiary/10 p-3">
        <p className="text-sm text-ink-primary whitespace-pre-wrap">{reply.texto}</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs text-ink-tertiary">
            {new Date(reply.createdAt).toLocaleDateString('pt-PT')}
          </span>
          {user && canReply && (
            <button
              type="button"
              className="text-xs text-accent hover:underline"
              onClick={() => { setShowReplyForm(!showReplyForm); }}
            >
              Responder
            </button>
          )}
        </div>
      </div>

      {showReplyForm && (
        <div className="mt-2 ml-6">
          <ReplyForm
            discussionId={discussionId}
            paiId={reply.id}
            onSuccess={() => { setShowReplyForm(false); }}
          />
        </div>
      )}

      {children.length > 0 && (
        <div className="mt-3">
          {children.map((child) => (
            <ReplyNode
              key={child.id.toString()}
              reply={child}
              childrenMap={childrenMap}
              depth={depth + 1}
              discussionId={discussionId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReplyForm({
  discussionId,
  paiId,
  onSuccess,
}: {
  discussionId: string;
  paiId?: number;
  onSuccess?: () => void;
}) {
  const [texto, setTexto] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { texto: string; paiId?: number }) =>
      discussionsApi.reply(discussionId, data),
    onSuccess: () => {
      setTexto('');
      void qc.invalidateQueries({ queryKey: ['discussion-replies', discussionId] });
      if (onSuccess) onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    
    const payload: { texto: string; paiId?: number } = { texto };
    if (paiId !== undefined) payload.paiId = paiId;
    
    mutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <textarea
        className="w-full rounded-lg border border-ink-tertiary/10 bg-canvas p-3 text-sm"
        placeholder="Escreve a tua resposta..."
        rows={3}
        value={texto}
        onChange={(e) => { setTexto(e.target.value); }}
      />
      <div className="flex justify-end">
        <Button size="sm" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'A enviar...' : 'Enviar resposta'}
        </Button>
      </div>
    </form>
  );
}
