import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CourseItemGallery } from './CourseItemGallery';

describe('CourseItemGallery', () => {
  it('apresenta uma imagem sem controlos de galeria', () => {
    render(
      <CourseItemGallery
        images={[{ url: 'https://cdn.example.com/one.webp', alt: 'Uma sala de aula' }]}
      />
    );

    expect(screen.getByRole('img', { name: 'Uma sala de aula' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Imagem seguinte' })).toBeNull();
  });

  it('apresenta várias imagens numa faixa horizontal navegável', () => {
    render(
      <CourseItemGallery
        images={[
          { url: 'https://cdn.example.com/one.webp', alt: 'Primeira etapa do projeto' },
          { url: 'https://cdn.example.com/two.webp', alt: 'Segunda etapa do projeto' },
        ]}
      />
    );

    expect(screen.getAllByRole('img')).toHaveLength(2);
    const track = screen.getByTestId('course-item-gallery-track');
    const scrollBy = vi.fn();
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 1_000 });
    Object.defineProperty(track, 'scrollBy', { configurable: true, value: scrollBy });

    fireEvent.click(screen.getByRole('button', { name: 'Imagem anterior' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -850, behavior: 'smooth' });

    fireEvent.click(screen.getByRole('button', { name: 'Imagem seguinte' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 850, behavior: 'smooth' });
  });

  it('não renderiza endereços de imagem inseguros', () => {
    render(<CourseItemGallery images={[{ url: 'javascript:alert(1)', alt: 'Imagem insegura' }]} />);

    expect(screen.queryByRole('img', { name: 'Imagem insegura' })).toBeNull();
    expect(screen.getByText(/não têm um endereço seguro disponível/i)).toBeVisible();
  });
});
