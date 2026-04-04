import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button, Spinner } from '@/components/ui';
import { mentoriasApi } from '@/lib/api/mentorias';
import { perfisApi } from '@/lib/api/perfis';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SolicitarMentoriaModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [mentorId, setMentorId] = useState('');
  const [mensagem, setMensagem] = useState('');

  const { data: mentores = [], isLoading: loadingMentores } = useQuery({
    queryKey: ['perfis', 'mentor'],
    queryFn: () => perfisApi.getByRole('mentor'),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () => mentoriasApi.solicitar({ mentorId, mensagem }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mentorias'] });
      setMentorId('');
      setMensagem('');
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <Modal open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <h2 className="text-lg font-semibold text-text-primary">Solicitar Mentoria</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Mentor</label>
          {loadingMentores ? (
            <Spinner size="sm" />
          ) : (
            <select
              value={mentorId}
              onChange={(e) => { setMentorId(e.target.value); }}
              required
              className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber"
            >
              <option value="">Selecionar mentor…</option>
              {mentores.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Mensagem</label>
          <textarea
            value={mensagem}
            onChange={(e) => { setMensagem(e.target.value); }}
            required
            minLength={10}
            maxLength={500}
            rows={4}
            placeholder="Descreve o que procuras nesta mentoria…"
            className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-error">Erro ao solicitar mentoria. Tenta novamente.</p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Enviar pedido
          </Button>
        </div>
      </form>
    </Modal>
  );
}
