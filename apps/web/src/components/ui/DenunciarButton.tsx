import { useState } from 'react';
import { Button } from './Button';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from './Modal';
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
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const fullMotivo = descricao ? `${motivo}: ${descricao}` : motivo;
      await denunciasApi.criar({ conteudoId, conteudoTipo, motivo: fullMotivo });
      toast({ 
        title: 'Denúncia enviada', 
        description: 'Obrigado por nos ajudar a manter a plataforma segura.',
      });
      setOpen(false);
      setDescricao('');
    } catch {
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível enviar a denúncia.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button 
        variant="danger" 
        size="sm" 
        onClick={() => setOpen(true)}
        className="text-xs"
      >
        Denunciar
      </Button>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalHeader>
          <ModalTitle>Denunciar conteúdo</ModalTitle>
          <ModalDescription>
            Ajude-nos a identificar conteúdos que violam as nossas diretrizes.
          </ModalDescription>
        </ModalHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Motivo</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber"
            >
              <option value="spam">Spam</option>
              <option value="conteudo_inapropriado">Conteúdo inapropriado</option>
              <option value="desinformacao">Desinformação</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Descrição (opcional)</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber min-h-[100px]"
              placeholder="Explique o problema em detalhe…"
            />
          </div>

          <ModalFooter>
            <Button 
              variant="ghost" 
              type="button" 
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              isLoading={loading}
            >
              Enviar denúncia
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
