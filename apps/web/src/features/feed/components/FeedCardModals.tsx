import { Copy, Mail, Send, Share2 } from 'lucide-react';
import { Button, Modal, ModalHeader, ModalTitle } from '@/components/ui';

interface FeedCardModalsProps {
  editOpen: boolean;
  shareOpen: boolean;
  internalShareOpen: boolean;
  editBody: string;
  originalBody: string;
  shareNote: string;
  shareText: string;
  shareUrl: string;
  title: string;
  alreadyShared: boolean;
  shareStatusLoading: boolean;
  editPending: boolean;
  sharePending: boolean;
  onEditOpenChange: (open: boolean) => void;
  onShareOpenChange: (open: boolean) => void;
  onInternalShareOpenChange: (open: boolean) => void;
  onEditBodyChange: (value: string) => void;
  onShareNoteChange: (value: string) => void;
  onSaveEdit: () => void;
  onInternalShare: () => void;
  onExternalShare: (channel: 'whatsapp' | 'email' | 'outro') => void;
  onCopyLink: () => void;
}

export function FeedCardModals(props: FeedCardModalsProps): React.JSX.Element {
  return (
    <>
      <Modal open={props.editOpen} onOpenChange={props.onEditOpenChange}>
        <ModalHeader className="mb-4">
          <ModalTitle className="font-serif text-xl font-bold">Editar Publicação</ModalTitle>
        </ModalHeader>
        <div className="relative">
          <textarea
            value={props.editBody}
            onChange={(event) => { props.onEditBodyChange(event.target.value); }}
            rows={6}
            maxLength={2000}
            className="min-h-[120px] w-full resize-y rounded-md border border-[var(--chrome-border)] bg-[var(--surface-elevated)] p-4 pb-8 text-sm text-[var(--ink-primary)] outline-none"
          />
          <span className="absolute bottom-3 right-4 text-[10px] font-bold text-[var(--ink-tertiary)]">
            {props.editBody.length.toLocaleString('pt-PT')} / 2 000
          </span>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => { props.onEditOpenChange(false); }}>Cancelar</Button>
          <Button
            className="bg-[var(--accent-terracotta)] font-bold uppercase tracking-widest text-white"
            onClick={props.onSaveEdit}
            isLoading={props.editPending}
            disabled={props.editBody.trim().length === 0 || props.editBody.trim() === props.originalBody.trim()}
          >
            Guardar
          </Button>
        </div>
      </Modal>

      <Modal open={props.shareOpen} onOpenChange={props.onShareOpenChange}>
        <ModalHeader className="mb-4">
          <ModalTitle className="font-serif text-xl font-bold">Partilhar publicação</ModalTitle>
        </ModalHeader>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => { props.onInternalShareOpenChange(true); }}
            className="flex min-h-11 items-center gap-3 border border-[var(--accent-terracotta)] px-4 text-sm font-semibold text-[var(--accent-terracotta)]"
          >
            <Send size={18} /> Partilhar no PDC
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${props.shareText.slice(0, 200)}\n${props.shareUrl}`)}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => { props.onExternalShare('whatsapp'); }}
            className="flex min-h-11 items-center gap-3 border border-[var(--chrome-border)] px-4 text-sm font-semibold text-[var(--ink-primary)]"
          >
            <Share2 size={18} /> WhatsApp
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(props.title)}&body=${encodeURIComponent(`${props.shareText}\n\n${props.shareUrl}`)}`}
            onClick={() => { props.onExternalShare('email'); }}
            className="flex min-h-11 items-center gap-3 border border-[var(--chrome-border)] px-4 text-sm font-semibold text-[var(--ink-primary)]"
          >
            <Mail size={18} /> Email
          </a>
          <button
            type="button"
            onClick={props.onCopyLink}
            className="flex min-h-11 items-center gap-3 border border-[var(--chrome-border)] px-4 text-sm font-semibold text-[var(--ink-primary)]"
          >
            <Copy size={18} /> Copiar link
          </button>
        </div>
      </Modal>

      <Modal open={props.internalShareOpen} onOpenChange={props.onInternalShareOpenChange}>
        <ModalHeader className="mb-4">
          <ModalTitle className="font-serif text-xl font-bold">Republicar no PDC</ModalTitle>
        </ModalHeader>
        <div className="space-y-4">
          {props.alreadyShared && (
            <p className="border border-[var(--accent-terracotta)]/30 bg-[var(--accent-terracotta)]/10 p-3 text-sm text-[var(--ink-secondary)]">
              Já republicaste este conteúdo.
            </p>
          )}
          <div>
            <textarea
              value={props.shareNote}
              onChange={(event) => { props.onShareNoteChange(event.target.value); }}
              maxLength={500}
              rows={4}
              placeholder="Acrescenta uma nota (opcional)"
              disabled={props.alreadyShared}
              className="w-full resize-none border border-[var(--chrome-border)] bg-[var(--surface-elevated)] p-3 text-sm text-[var(--ink-primary)] outline-none"
            />
            <span className="mt-1 block text-right text-[10px] font-bold text-[var(--ink-tertiary)]">
              {props.shareNote.length.toLocaleString('pt-PT')} / 500
            </span>
          </div>
          <Button
            className="w-full bg-[var(--accent-terracotta)] text-white"
            disabled={props.sharePending || props.shareStatusLoading || props.alreadyShared}
            isLoading={props.sharePending}
            onClick={props.onInternalShare}
          >
            Republicar
          </Button>
        </div>
      </Modal>
    </>
  );
}
