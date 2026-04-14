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
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onBack}>
          ← Voltar
        </Button>
        {isMentorOrAdmin && (
          <>
            <Button size="sm" variant="secondary" onClick={() => onPin(!discussion.pinned)}>
              {discussion.pinned ? 'Desafixar' : 'Fixar'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onResolve(!discussion.resolved)}>
              {discussion.resolved ? 'Reabrir' : 'Resolver'}
            </Button>
          </>
        )}
      </div>

      {/* Thread body */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          {discussion.pinned && <Badge variant="warning">Fixado</Badge>}
          {discussion.resolved && <Badge variant="success">Resolvido</Badge>}
        </div>
        <h2 className="text-xl font-bold text-text-primary">{discussion.titulo}</h2>
        <p className="mt-2 text-text-secondary whitespace-pre-wrap">{discussion.corpo}</p>
        <p className="mt-3 text-xs text-text-muted">
          {new Date(discussion.createdAt).toLocaleDateString('pt-PT')}
        </p>
      </div>

      {/* Replies */}
      <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
        Respostas {replies.length > 0 && `(${replies.length})`}
      </h3>

      {isLoading ? (
        <p className="py-4 text-center text-text-muted">A carregar respostas...</p>
      ) : replies.length === 0 ? (
        <p className="py-4 text-center text-text-muted">Ainda não há respostas.</p>
      ) : (
        <ReplyTree replies={replies} discussionId={discussionId} />
      )}

      {/* Reply form */}
      {user && (
        <ReplyForm discussionId={discussionId} />
      )}
    </div>
  );
}

// ── Reply tree (nested up to 3 levels) ──────────────────────────────────────

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
          key={r.id}
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
  const canReply = depth < 2; // max 3 levels (0, 1, 2)

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-border pl-4' : ''}>
      <div className="rounded-lg border border-border p-3">
        <p className="text-sm text-text-primary whitespace-pre-wrap">{reply.texto}</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs text-text-muted">
            {new Date(reply.createdAt).toLocaleDateString('pt-PT')}
          </span>
          {user && canReply && (
            <button
              type="button"
              className="text-xs text-accent hover:underline"
              onClick={() => setShowReplyForm(!showReplyForm)}
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
            onSuccess={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {children.length > 0 && (
        <div className="mt-2 space-y-2">
          {children.map((child) => (
            <ReplyNode
              key={child.id}
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

// ── Reply form ──────────────────────────────────────────────────────────────

function ReplyForm({
  discussionId,
  paiId,
  onSuccess,
}: {
  discussionId: string;
  paiId?: number;
  onSuccess?: () => void;
}) {
  const qc = useQueryClient();
  const [texto, setTexto] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      discussionsApi.postReply(discussionId, {
        texto,
        ...(paiId ? { paiId } : {}),
      }),
    onSuccess: () => {
      setTexto('');
      void qc.invalidateQueries({ queryKey: ['discussion-replies', discussionId] });
      onSuccess?.();
    },
  });

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <textarea
        className="flex-1 rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
        placeholder="Escreve a tua resposta..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        required
        rows={2}
        maxLength={5000}
      />
      <Button
        type="submit"
        size="sm"
        isLoading={mutation.isPending}
        disabled={!texto.trim()}
      >
        Enviar
      </Button>
    </form>
  );
}
