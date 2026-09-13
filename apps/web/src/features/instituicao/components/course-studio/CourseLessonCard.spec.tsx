import { fireEvent, render, screen } from '@testing-library/react';
import { useForm, type UseFormTrigger } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import type { CriarCursoPayload } from '@pdc/shared';
import { CourseLessonCard } from './CourseLessonCard';

const defaultValues: CriarCursoPayload = {
  titulo: 'Curso completo',
  descricao: 'Descrição completa para o curso.',
  area: 'TECNOLOGIA',
  nivel: 'medio',
  regrasAcesso: {},
  modulos: [{
    titulo: 'Introdução',
    ordem: 1,
    itens: [{ titulo: 'Aula inicial', tipo: 'texto', conteudo: 'Conteúdo completo.', ordem: 1 }],
  }],
};

function Harness({
  trigger,
  onOpenChange,
}: {
  trigger: UseFormTrigger<CriarCursoPayload>;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const form = useForm<CriarCursoPayload>({ defaultValues });
  return (
    <CourseLessonCard
      moduleIndex={0}
      itemIndex={0}
      control={form.control}
      register={form.register}
      setValue={form.setValue}
      trigger={trigger}
      open
      onOpenChange={onOpenChange}
      canMoveUp={false}
      canMoveDown={false}
      canDelete={false}
      canDuplicate
      videoTypeAvailable
      onMove={vi.fn()}
      onDuplicate={vi.fn()}
      onTypeChange={vi.fn()}
      onRequestDelete={vi.fn()}
      onDragStart={vi.fn()}
      onDrop={vi.fn()}
    />
  );
}

describe('CourseLessonCard', () => {
  it('mantém o editor aberto quando a validação não pode ser executada', async () => {
    const failingTrigger: UseFormTrigger<CriarCursoPayload> = () =>
      Promise.reject(new Error('validador indisponível'));
    const onOpenChange = vi.fn();
    render(<Harness trigger={failingTrigger} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Validar e fechar aula' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível validar esta aula. Tenta novamente.'
    );
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Título da aula' })).toBeVisible();
  });
});
