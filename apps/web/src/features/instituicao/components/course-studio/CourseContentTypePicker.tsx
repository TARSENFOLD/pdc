import { Button, Modal, ModalDescription, ModalHeader, ModalTitle } from '@/components/ui';
import { COURSE_ITEM_TYPES, type CourseItemType } from './course-curriculum';

interface CourseContentTypePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: CourseItemType) => void;
  videoAvailable: boolean;
}

export function CourseContentTypePicker({
  open,
  onOpenChange,
  onSelect,
  videoAvailable,
}: CourseContentTypePickerProps): React.JSX.Element {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalHeader>
        <ModalTitle>Que tipo de aula queres adicionar?</ModalTitle>
        <ModalDescription>Escolhe o formato principal da página. Podes juntar imagens e texto dentro da aula.</ModalDescription>
      </ModalHeader>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {COURSE_ITEM_TYPES.map((option) => {
          const Icon = option.icon;
          const disabled = !option.publishable || (option.value === 'video' && !videoAvailable);
          const disabledDescription = !option.publishable
            ? option.description
            : 'Este módulo já tem o seu vídeo de abertura.';
          return (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => { onSelect(option.value); }}
              className="h-auto min-h-20 justify-start gap-3 rounded-lg px-4 py-3 text-left normal-case tracking-normal"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon size={19} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink-primary">{option.label}</span>
                <span className="mt-0.5 block text-xs font-normal leading-4 text-ink-tertiary">
                  {disabled ? disabledDescription : option.description}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </Modal>
  );
}
