import { Button, Modal, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui';

interface CourseDeleteDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CourseDeleteDialog({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: CourseDeleteDialogProps): React.JSX.Element {
  return (
    <Modal open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onCancel(); }}>
      <ModalHeader>
        <ModalTitle>{title}</ModalTitle>
        <ModalDescription>{description}</ModalDescription>
      </ModalHeader>
      <ModalFooter className="mt-4 gap-2 sm:space-x-0">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="button" variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
      </ModalFooter>
    </Modal>
  );
}
