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
        <ModalDescription>
          Escolhe o formato principal da página. Podes juntar imagens e texto dentro da aula.
        </ModalDescription>
      </ModalHeader>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {COURSE_ITEM_TYPES.map((option) => {
          const Icon = option.icon;
          const disabled = !option.publishable || (option.value === 'video' && !videoAvailable);
          const disabledDescription = !option.publishable
            ? 'Este formato ainda não está disponível para publicação.'
            : 'Este módulo já tem o seu vídeo de abertura.';
          return (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => {
                onSelect(option.value);
              }}
              className="h-auto min-h-20 justify-start gap-3 rounded-lg px-4 py-3 text-left tracking-normal normal-case"
            >
              <span className="bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <Icon size={19} aria-hidden="true" />
              </span>
              <span>
                <span className="text-ink-primary block text-sm font-bold">{option.label}</span>
                <span className="text-ink-tertiary mt-0.5 block text-xs leading-4 font-normal">
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
