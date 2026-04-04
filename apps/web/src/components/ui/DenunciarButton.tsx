import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from './Button';
import { denunciasApi } from '@/lib/api/denuncias';
import { useToast } from '@/hooks/useToast';

interface Props {
  conteudoId: string;
  conteudoTipo: string;
}

export function DenunciarButton({ conteudoId, conteudoTipo }: Props) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState('spam');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const fullMotivo = descricao ? `${motivo}: ${descricao}` : motivo;
      await denunciasApi.criar({ conteudoId, conteudoTipo, motivo: fullMotivo });
      toast.show({ title: 'Denúncia enviada', description: 'Obrigado por nos ajudar a manter a plataforma segura.', variant: 'success' });
      setOpen(false);
      setDescricao('');
    } catch {
      toast.show({ title: 'Erro', description: 'Não foi possível enviar a denúncia.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm" className="text-error border-error hover:bg-error/10">
          Denunciar
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-surface-raised border border-border p-6 rounded-xl shadow-xl z-50">
          <Dialog.Title className="text-xl font-bold text-text-primary">Denunciar conteúdo</Dialog.Title>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary">Motivo</label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber"
              >
                <option value="spam">Spam</option>
                <option value="conteudo_inapropriado">Conteúdo inapropriado</option>
                <option value="desinformacao">Desinformação</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary">Descrição (opcional)</label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber min-h-[100px]"
                placeholder="Explique o problema…"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <Button variant="secondary" type="button">Cancelar</Button>
              </Dialog.Close>
              <Button type="submit" isLoading={loading} className="bg-amber text-background">
                Enviar denúncia
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
