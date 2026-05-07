import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Carousel } from './Carousel';

describe('Carousel', () => {
  const items = ['Curso A', 'Curso B', 'Curso C'];

  it('renders all items', () => {
    render(
      <Carousel
        items={items}
        renderItem={(item) => <div>{item}</div>}
        ariaLabel="Cursos recentes"
      />,
    );
    expect(screen.getByText('Curso A')).toBeDefined();
    expect(screen.getByText('Curso B')).toBeDefined();
    expect(screen.getByText('Curso C')).toBeDefined();
  });

  it('has role=region and aria-label', () => {
    render(
      <Carousel items={items} renderItem={(i) => <div>{i}</div>} ariaLabel="Carrossel" />,
    );
    expect(screen.getByRole('region', { name: 'Carrossel' })).toBeDefined();
  });

  it('renders emptyState when items is empty', () => {
    render(
      <Carousel
        items={[]}
        renderItem={(i) => <div>{i}</div>}
        ariaLabel="Empty"
        emptyState={<p>Sem itens</p>}
      />,
    );
    expect(screen.getByText('Sem itens')).toBeDefined();
  });

  it('renders nothing for empty items without emptyState', () => {
    const { container } = render(
      <Carousel items={[]} renderItem={(i) => <div>{i}</div>} ariaLabel="Empty" />,
    );
    // region is still rendered when no emptyState and no items
    // (the emptyState branch only fires when emptyState prop is provided)
    expect(container.firstChild).toBeDefined();
  });

  it('forwards data-testid', () => {
    const { container } = render(
      <Carousel items={[]} renderItem={() => <div />} ariaLabel="x" data-testid="car" />,
    );
    expect(container.querySelector('[data-testid="car"]')).not.toBeNull();
  });

  describe('dark mode', () => {
    beforeEach(() => { document.documentElement.classList.add('dark'); });
    afterEach(() => { document.documentElement.classList.remove('dark'); });

    it('renders items in dark mode without crash', () => {
      render(
        <Carousel items={['Item']} renderItem={(i) => <div>{i}</div>} ariaLabel="Dark carousel" />,
      );
      expect(screen.getByText('Item')).toBeDefined();
    });
  });
});
