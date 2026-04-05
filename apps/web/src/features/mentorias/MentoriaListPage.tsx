import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mentoriasApi } from '@/lib/api/mentorias';
import { useAuth } from '@/lib/auth/AuthContext';
import { Spinner, Badge, Button } from '@/components/ui';
import { SolicitarMentoriaModal } from './SolicitarMentoriaModal';
import { useState } from 'react';
import type { Mentoria } from '@pdc/shared';

const estadoVariant: Record<string, 'warning' | 'success' | 'error' | 'outline'> = {
  pendente: 'warning',
  aceite: 'success',
  recusada: 'error',
  concluida: 'outline',
};

interface MentoriaExibicao extends Mentoria {
  mentorNome?: string;
  alunoNome?: string;
}

function MentoriaRow({ mentoria, onAction }: { mentoria: MentoriaExibicao; onAction: (id: string, action: 'aceitar' | 'recusar' | 'concluir') => void; }) {
  const { user } = useAuth();
  const isMentor = user?.role === 'mentor';
  const isAluno = user?.role === 'aluno';

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{mentoria.mensagem}</p>
        <p className="mt-0.5 text-xs text-text-muted">
          {isAluno ? `Mentor: ${mentoria.mentorNome ?? mentoria.mentorId}` : `Aluno: ${mentoria.alunoNome ?? mentoria.alunoId}`}
        </p>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-2">
        <Badge variant={estadoVariant[mentoria.estado] ?? 'outline'}>{mentoria.estado}</Badge>
        {isMentor && mentoria.estado === 'pendente' && (
          <>
            <Button size="sm" onClick={() => { onAction(mentoria.id, 'aceitar'); }}>Aceitar</Button>
            <Button size="sm" variant="danger" onClick={() => { onAction(mentoria.id, 'recusar'); }}>Recusar</Button>
          </>
        )}
        {mentoria.estado === 'aceite' && (
          <Button size="sm" variant="secondary" onClick={() => { onAction(mentoria.id, 'concluir'); }}>Concluir</Button>
        )}
      </div>
    </div>
  );
}

export function MentoriaListPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['mentorias'],
    queryFn: mentoriasApi.list,
  });

  const aceitarMutation = useMutation({
    mutationFn: (id: string) => mentoriasApi.aceitar(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['mentorias'] }),
  });

  const recusarMutation = useMutation({
    mutationFn: (id: string) => mentoriasApi.recusar(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['mentorias'] }),
  });

  const concluirMutation = useMutation({
    mutationFn: (id: string) => mentoriasApi.concluir(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['mentorias'] }),
  });

  function handleAction(id: string, action: 'aceitar' | 'recusar' | 'concluir') {
    if (action === 'aceitar') aceitarMutation.mutate(id);
    else if (action === 'recusar') recusarMutation.mutate(id);
    else concluirMutation.mutate(id);
  }

  const mentorias = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Mentorias</h1>
        {user?.role === 'aluno' && (
          <Button size="sm" onClick={() => { setModalOpen(true); }}>
            Solicitar Mentoria
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <p className="py-12 text-center text-text-muted">Erro ao carregar mentorias.</p>
      ) : mentorias.length === 0 ? (
        <p className="py-12 text-center text-text-muted">Nenhuma mentoria encontrada.</p>
      ) : (
        <div className="space-y-3">
          {mentorias.map((m) => (
            <MentoriaRow key={m.id} mentoria={m} onAction={handleAction} />
          ))}
        </div>
      )}

      <SolicitarMentoriaModal open={modalOpen} onClose={() => { setModalOpen(false); }} />
    </div>
  );
}
