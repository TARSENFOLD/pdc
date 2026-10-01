import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExperiencePublishActions } from './ExperiencePublishActions';

describe('ExperiencePublishActions', () => {
  it('exige uma indicação útil ao devolver e envia-a com a transição', () => {
    const transition = vi.fn();
    render(
      <MemoryRouter>
        <ExperiencePublishActions
          vwx={false}
          state="review"
          message=""
          busy={false}
          canApprove
          id="exp"
          slug="exp"
          save={vi.fn()}
          transition={transition}
        />
      </MemoryRouter>
    );
    const button = screen.getByRole('button', { name: 'Devolver para correção' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Motivo da devolução'), {
      target: { value: 'Acrescenta exemplos concretos.' },
    });
    fireEvent.click(button);
    expect(transition).toHaveBeenCalledWith('rejected', 'Acrescenta exemplos concretos.');
  });

  it('mostra a indicação de correção ao criador sem expor ações editoriais', () => {
    render(
      <MemoryRouter>
        <ExperiencePublishActions
          vwx={false}
          state="rejected"
          message=""
          busy={false}
          canApprove={false}
          id="exp"
          slug="exp"
          rejectionReason="Acrescenta exemplos concretos."
          save={vi.fn()}
          transition={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole('status')).toHaveTextContent('Acrescenta exemplos concretos.');
    expect(screen.queryByRole('button', { name: 'Aprovar conteúdo' })).toBeNull();
  });
});
