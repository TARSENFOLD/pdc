import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button, Spinner } from '@/components/ui';
import { mentoriasApi } from '@/lib/api/mentorias';
import { perfisApi } from '@/lib/api/perfis';
import { cursosApi } from '@/lib/api/cursos';
import { http } from '@/lib/api/http';
import type { MentoriaTipo } from '@pdc/shared';

interface Props {
  open: boolean;
  onClose: () => void;
}

const selectCls = 'w-full rounded-md border border-ink-tertiary/10 bg-elevated px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent';

export function SolicitarMentoriaModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [mentorId, setMentorId] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tipo, setTipo] = useState<MentoriaTipo>('orientacao_vocacional');
  const [preco, setPreco] = useState('0');
  const [cursoId, setCursoId] = useState('');
  const [projetoId, setProjetoId] = useState('');

  const { data: mentores = [], isLoading: loadingMentores } = useQuery({
    queryKey: ['perfis', 'mentor'],
    queryFn: () => perfisApi.getByRole('mentor'),
    enabled: open,
  });

  const { data: meusInscricoesData } = useQuery({
    queryKey: ['cursos', 'me', 'inscricoes'],
    queryFn: () => cursosApi.getMinhasInscricoes(),
    enabled: open && tipo === 'acompanhamento_curso',
  });

  const { data: meusProjetosData } = useQuery({
    queryKey: ['projetos', 'meus'],
    queryFn: () => http.get<{ data: Array<{ id: string; titulo: string }> }>('/projetos?estudanteId=me'),
    enabled: open && tipo === 'revisao_projeto',
  });

  const mutation = useMutation({
    mutationFn: () => mentoriasApi.solicitar({
      mentorId,
      mensagem,
      tipo,
      preco: Number(preco),
      ...(cursoId ? { cursoId } : {}),
      ...(projetoId ? { projetoId } : {}),
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mentorias'] });
      setMentorId('');
      setMensagem('');
      setTipo('orientacao_vocacional');
      setPreco('0');
      setCursoId('');
      setProjetoId('');
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <Modal open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <h2 className="text-lg font-semibold text-ink-primary">Solicitar Mentoria</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-secondary">Mentor</label>
          {loadingMentores ? (
            <Spinner size="sm" />
          ) : (
            <select
              value={mentorId}
              onChange={(e) => { setMentorId(e.target.value); }}
              required
              className="w-full rounded-md border border-ink-tertiary/10 bg-elevated px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
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
          <label className="mb-1 block text-xs font-medium text-ink-secondary">Tipo de mentoria</label>
          <select
            value={tipo}
            onChange={(e) => { setTipo(e.target.value as MentoriaTipo); }}
            className={selectCls}
          >
            <option value="orientacao_vocacional">Orientação Vocacional</option>
            <option value="acompanhamento_curso">Acompanhamento de Curso</option>
            <option value="revisao_projeto">Revisão de Projecto</option>
          </select>
        </div>

        {tipo === 'acompanhamento_curso' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">Curso</label>
            <select
              value={cursoId}
              onChange={(e) => { setCursoId(e.target.value); }}
              required
              className={selectCls}
            >
              <option value="">Seleccionar curso…</option>
              {(meusInscricoesData?.data ?? []).map((i) => (
                <option key={i.cursoId} value={i.cursoId}>{i.cursoId}</option>
              ))}
            </select>
          </div>
        )}

        {tipo === 'revisao_projeto' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">Projecto</label>
            <select
              value={projetoId}
              onChange={(e) => { setProjetoId(e.target.value); }}
              required
              className={selectCls}
            >
              <option value="">Seleccionar projecto…</option>
              {(meusProjetosData?.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.titulo}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-secondary">
            Preço proposto (USD) - 0 = gratuita
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={preco}
            onChange={(e) => { setPreco(e.target.value); }}
            className={selectCls}
          />
          {Number(preco) > 0 && (
            <p className="mt-1 text-xs text-ink-tertiary">
              Comissão PDC (20%): ${(Number(preco) * 0.20).toFixed(2)} - Recebes: ${(Number(preco) * 0.80).toFixed(2)}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-secondary">Mensagem</label>
          <textarea
            value={mensagem}
            onChange={(e) => { setMensagem(e.target.value); }}
            required
            minLength={10}
            maxLength={500}
            rows={4}
            placeholder="Descreve o que procuras nesta mentoria…"
            className="w-full rounded-md border border-ink-tertiary/10 bg-elevated px-3 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
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
