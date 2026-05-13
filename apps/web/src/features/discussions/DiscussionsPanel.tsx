import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discussionsApi, type Discussion } from '../../lib/api/discussions';
import { useAuth } from '../../lib/auth/auth-context';
import { Button, Card, Spinner, Input, Badge } from '../../components/ui';
import { DiscussionThread } from './DiscussionThread';

interface Props {
  cursoId: string;
  isMentorOrAdmin?: boolean;
}

export function DiscussionsPanel({ cursoId, isMentorOrAdmin = false }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeDiscussion, setActiveDiscussion] = useState<Discussion | null>(null);
  const [showForm, setShowShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['discussions', cursoId],
    queryFn: () => discussionsApi.list(cursoId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { titulo: string; corpo: string }) =>
      discussionsApi.create(cursoId, payload.titulo, payload.corpo),
    onSuccess: () => {
      setShowShowForm(false);
      setNewTitle('');
      setNewBody('');
      void qc.invalidateQueries({ queryKey: ['discussions', cursoId] });
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      discussionsApi.pin(id, pinned),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['discussions', cursoId] });
      if (activeDiscussion) {
        setActiveDiscussion({ ...activeDiscussion, pinned: !activeDiscussion.pinned });
      }
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) =>
      discussionsApi.resolve(id, resolved),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['discussions', cursoId] });
      if (activeDiscussion) {
        setActiveDiscussion({ ...activeDiscussion, resolved: !activeDiscussion.resolved });
      }
    },
  });

  const discussions: Discussion[] = data?.data ?? [];

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

  if (activeDiscussion) {
    return (
      <DiscussionThread
        discussion={activeDiscussion}
        isMentorOrAdmin={isMentorOrAdmin}
        onBack={() => { setActiveDiscussion(null); }}
        onPin={(pinned) => { pinMutation.mutate({ id: String(activeDiscussion.id), pinned }); }}
        onResolve={(resolved) => { resolveMutation.mutate({ id: String(activeDiscussion.id), resolved }); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Discussões do Curso</h2>
        {user && !showForm && (
          <Button size="sm" onClick={() => { setShowShowForm(true); }}>
            Nova Discussão
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="p-4 space-y-3">
          <Input
            placeholder="Título da discussão"
            value={newTitle}
            onChange={(e) => { setNewTitle(e.target.value); }}
          />
          <textarea
            className="w-full rounded-md border border-ink-tertiary/10 bg-canvas p-3 text-sm"
            placeholder="Descreve a tua dúvida ou tópico..."
            rows={4}
            value={newBody}
            onChange={(e) => { setNewBody(e.target.value); }}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setShowShowForm(false); }}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!newTitle || !newBody || createMutation.isPending}
              onClick={() => { createMutation.mutate({ titulo: newTitle, corpo: newBody }); }}
            >
              Criar Tópico
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {discussions.length === 0 ? (
          <p className="py-8 text-center text-ink-tertiary">Ainda não há discussões neste curso.</p>
        ) : (
          discussions.map((d: Discussion) => (
            <Card
              key={d.id.toString()}
              className="cursor-pointer p-4 hover:border-accent transition-colors"
              onClick={() => { setActiveDiscussion(d); }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-ink-primary">{d.titulo}</h3>
                <div className="flex gap-2">
                  {d.pinned && <Badge variant="warning">Fixado</Badge>}
                  {d.resolved && <Badge variant="success">Resolvido</Badge>}
                </div>
              </div>
              <p className="mt-1 text-sm text-ink-secondary line-clamp-2">{d.corpo}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-ink-tertiary">
                <span>{new Date(d.createdAt).toLocaleDateString('pt-PT')}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
