import { fireEvent, render, screen } from '@testing-library/react';
import { avaliarProntidaoCurso } from '@pdc/shared';
import { describe, expect, it, vi } from 'vitest';
import { CourseReviewPanel } from './CourseReviewPanel';

const values = {
  titulo: 'Curso pronto',
  descricao: 'Descrição suficientemente completa.',
  area: 'TECNOLOGIA' as const,
  nivel: 'medio' as const,
  capaUrl: 'https://cdn.example.com/capa.webp',
  visibilidade: 'publico' as const,
  gratuito: true,
  regrasAcesso: {},
  modulos: [
    {
      titulo: 'Módulo inicial',
      ordem: 1,
      itens: [
        {
          titulo: 'Aula inicial',
          tipo: 'texto' as const,
          conteudo: 'Conteúdo completo.',
          ordem: 1,
        },
      ],
    },
  ],
};

describe('CourseReviewPanel', () => {
  it('mostra a ação direta de guardar e submeter um curso novo', () => {
    const onSubmit = vi.fn();
    render(
      <CourseReviewPanel
        values={values}
        readiness={avaliarProntidaoCurso(values)}
        onResolve={vi.fn()}
        submitLabel="Guardar e submeter para revisão"
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Guardar e submeter para revisão' }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(screen.getByText('Tecnologia · Intermédio')).toBeVisible();
  });

  it('indica a etapa incompleta e mantém a submissão bloqueada', () => {
    const onResolve = vi.fn();
    const onSubmit = vi.fn();
    const incompleteValues = { ...values, capaUrl: '' };
    render(
      <CourseReviewPanel
        values={incompleteValues}
        readiness={avaliarProntidaoCurso(incompleteValues)}
        onResolve={onResolve}
        submitLabel="Guardar e submeter para revisão"
        onSubmit={onSubmit}
        submitDisabled
      />
    );

    expect(screen.getByText('2/3')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Corrigir: Informação básica' }));
    expect(onResolve).toHaveBeenCalledWith('info');

    const submitButton = screen.getByRole('button', { name: 'Guardar e submeter para revisão' });
    expect(submitButton).toBeDisabled();
    fireEvent.click(submitButton);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
