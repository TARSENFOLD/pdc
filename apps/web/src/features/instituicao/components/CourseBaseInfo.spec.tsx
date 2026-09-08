import { fireEvent, render, screen, within } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import type { CriarCursoPayload } from '@pdc/shared';
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

  return (
    <CourseBaseInfo
      control={form.control}
      register={form.register}
      errors={{ descricao: { type: 'manual', message: 'Descrição demasiado curta.' } }}
    />
  );
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
    expect(within(preview).getByText('Aprende a validar uma ideia e lançar uma primeira versão útil.')).toBeVisible();
    expect(screen.getByText((_, element) => element?.id === 'course-description-count'))
      .toHaveTextContent(/^62\/2\s000$/);
  });

  it('explica o erro da descrição e marca o campo como inválido', () => {
    render(<CourseBaseInfoErrorHarness />);

    expect(screen.getByRole('textbox', { name: 'Descrição do curso' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Descrição demasiado curta.')).toBeVisible();
    expect(screen.queryByText(/Entre 10 e 2\s000 caracteres\./)).not.toBeInTheDocument();
  });
});
