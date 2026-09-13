import { fireEvent, render, screen, within } from '@testing-library/react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { CURSO_DESCRICAO_MAX_LENGTH, type CriarCursoPayload } from '@pdc/shared';
import { CourseBaseInfo } from './CourseBaseInfo';

function CourseBaseInfoHarness(): React.JSX.Element {
  const form = useForm<CriarCursoPayload>({
    defaultValues: {
      titulo: '',
      descricao: '',
      area: 'TECNOLOGIA',
      nivel: 'medio',
      modulos: [],
    },
  });

  return (
    <CourseBaseInfo
      control={form.control}
      register={form.register}
      errors={form.formState.errors}
    />
  );
}

function CourseBaseInfoErrorHarness(): React.JSX.Element {
  const form = useForm<CriarCursoPayload>({
    defaultValues: {
      titulo: '',
      descricao: '',
      area: 'TECNOLOGIA',
      nivel: 'medio',
      modulos: [],
    },
  });

  const errors: FieldErrors<CriarCursoPayload> = {
    descricao: { type: 'manual', message: 'Descrição demasiado curta.' },
  };

  return <CourseBaseInfo control={form.control} register={form.register} errors={errors} />;
}

describe('CourseBaseInfo', () => {
  it('explica o destino da descrição e atualiza a pré-visualização do catálogo', () => {
    render(<CourseBaseInfoHarness />);

    expect(screen.getByText(/As primeiras linhas aparecem no catálogo/)).toBeVisible();
    expect(screen.getByText(/Descrição do percurso/)).toBeVisible();

    fireEvent.change(screen.getByRole('textbox', { name: 'Título do curso' }), {
      target: { value: 'Introdução ao Produto Digital' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Descrição do curso' }), {
      target: { value: 'Aprende a validar uma ideia e lançar uma primeira versão útil.' },
    });

    const preview = screen.getByLabelText('Pré-visualização da descrição no catálogo');
    expect(within(preview).getByText('Introdução ao Produto Digital')).toBeVisible();
    expect(
      within(preview).getByText('Aprende a validar uma ideia e lançar uma primeira versão útil.')
    ).toBeVisible();
    const maxLength = new Intl.NumberFormat('pt-AO')
      .format(CURSO_DESCRICAO_MAX_LENGTH)
      .replaceAll('\u00a0', ' ');
    expect(
      screen.getByText((_, element) => element?.id === 'course-description-count')
    ).toHaveTextContent(`62/${maxLength}`);
  });

  it('explica o erro da descrição e marca o campo como inválido', () => {
    render(<CourseBaseInfoErrorHarness />);

    expect(screen.getByRole('textbox', { name: 'Descrição do curso' })).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(screen.getByText('Descrição demasiado curta.')).toBeVisible();
    expect(screen.queryByText(/Entre 10 e 2\s000 caracteres\./)).not.toBeInTheDocument();
  });
});
