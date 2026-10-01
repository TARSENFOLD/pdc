import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExperienciaSchema } from '@pdc/shared';
import { ExperienceCurriculum } from './ExperienceCurriculum';
const track = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));
const experience = ExperienciaSchema.parse({
  id: 'exp',
  slug: 'exp',
  titulo: 'Formação',
  descricao: 'Descrição',
  gradeDestaque: [
    { disciplina: 'Matemática', descricao: 'Fundamentos', relevanciaMercado: 'Análise' },
    { disciplina: 'Física', descricao: 'Mecânica', relevanciaMercado: 'Engenharia' },
  ],
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  track.mockClear();
});
describe('Telemetria curricular', () => {
  it('mede ao trocar, fechar e sair da disciplina sem duplicar eventos', () => {
    let now = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const view = render(<ExperienceCurriculum experience={experience} preview={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Matemática' }));
    now = 3500;
    fireEvent.click(screen.getByRole('button', { name: 'Física' }));
    expect(track).toHaveBeenLastCalledWith('experiencia.timeline_click', {
      experienceId: 'exp',
      discipline: 'Matemática',
      dwellTime: 2500,
    });
    now = 5500;
    fireEvent.click(screen.getByRole('button', { name: 'Física' }));
    expect(track).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Física' }));
    now = 7500;
    view.unmount();
    expect(track).toHaveBeenCalledTimes(3);
  });
  it('não regista telemetria de aluno na pré-visualização editorial', () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValue(5000);
    const view = render(<ExperienceCurriculum experience={experience} preview />);
    fireEvent.click(screen.getByRole('button', { name: 'Matemática' }));
    view.unmount();
    expect(track).not.toHaveBeenCalled();
  });
});
