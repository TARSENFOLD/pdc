import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('associa a etiqueta ao campo mesmo sem id explícito', () => {
    render(<Input label="Título da aula" name="titulo" />);

    expect(screen.getByRole('textbox', { name: 'Título da aula' })).toBeVisible();
  });

  it('preserva o id explícito fornecido pelo consumidor', () => {
    render(<Input id="course-title" label="Título do curso" />);

    expect(screen.getByLabelText('Título do curso')).toHaveAttribute('id', 'course-title');
  });
});
