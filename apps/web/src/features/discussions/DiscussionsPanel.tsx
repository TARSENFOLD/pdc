import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discussionsApi, type Discussion } from '../../lib/api/discussions';
import { useAuth } from '../../lib/auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DiscussionThread } from './DiscussionThread';

interface Props {
  cursoId: string;
  isMentorOrAdmin?: boolean;
}

export function DiscussionsPanel({ cursoId, isMentorOrAdmin = false }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedThread, setSelectedThread] = useState<Discussion | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['discussions', cursoId],
    queryFn: () => discussionsApi.getCourseDiscussions(cursoId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      discussionsApi.createDiscussion({
        titulo,
        corpo,
        cursoId: Number(cursoId),
      }),
    onSuccess: () => {
      setTitulo('');
      setCorpo('');
      setShowForm(false);
      void qc.invalidateQueries({ queryKey: ['discussions', cursoId] });
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      discussionsApi.pin(id, pinned),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['discussions', cursoId] }),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) =>
      discussionsApi.resolve(id, resolved),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['discussions', cursoId] }),
  });

  if (selectedThread) {
    return (
      <DiscussionThread
        discussion={selectedThread}
        isMentorOrAdmin={isMentorOrAdmin}
        onBack={() => setSelectedThread(null)}
        onPin={(pinned) =>
          pinMutation.mutate({ id: String(selectedThread.id), pinned })
        }
        onResolve={(resolved) =>
          resolveMutation.mutate({ id: String(selectedThread.id), resolved })
        }
      />
    );
  }

  const discussions = data?.data ?? [];

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">Discussões</h2>
        {user && (
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Nova Discussão'}
          </Button>
        )}
      </div>

      {showForm && (
        <form
          className="space-y-3 rounded-lg border border-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <input
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
            placeholder="Título da discussão"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            maxLength={300}
          />
          <textarea
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
            placeholder="Descreve a tua questão ou tópico..."
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            required
            rows={4}
            maxLength={10000}
          />
          <Button
            type="submit"
            size="sm"
            isLoading={createMutation.isPending}
            disabled={!titulo.trim() || !corpo.trim()}
          >
            Criar Discussão
          </Button>
          {createMutation.isError && (
            <p className="text-sm text-error">Erro ao criar discussão. Verifica se estás inscrito no curso.</p>
          )}
        </form>
      )}

      {isLoading ? (
        <p className="py-8 text-center text-text-muted">A carregar...</p>
      ) : discussions.length === 0 ? (
        <p className="py-8 text-center text-text-muted">Ainda não há discussões neste curso.</p>
      ) : (
        <div className="space-y-2">
          {discussions.map((d: Discussion) => (
            <button
              key={d.id}
              type="button"
              className="w-full rounded-lg border border-border p-4 text-left transition-colors hover:bg-surface-raised"
              onClick={() => setSelectedThread(d)}
            >
              <div className="flex items-center gap-2">
                {d.pinned && <Badge variant="warning">Fixado</Badge>}
                {d.resolved && <Badge variant="success">Resolvido</Badge>}
                <h3 className="font-semibold text-text-primary">{d.titulo}</h3>
              </div>
              <p className="mt-1 text-sm text-text-secondary line-clamp-2">{d.corpo}</p>
              <p className="mt-2 text-xs text-text-muted">
                {new Date(d.createdAt).toLocaleDateString('pt-PT')}
              </p>
              {isMentorOrAdmin && (
                <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => pinMutation.mutate({ id: String(d.id), pinned: !d.pinned })}
                  >
                    {d.pinned ? 'Desafixar' : 'Fixar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => resolveMutation.mutate({ id: String(d.id), resolved: !d.resolved })}
                  >
                    {d.resolved ? 'Reabrir' : 'Resolver'}
                  </Button>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
