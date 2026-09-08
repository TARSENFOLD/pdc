import { describe, expect, it } from 'vitest';
import type { Curso } from '@pdc/shared';
import { courseToFormValues, firstCourseFormErrorMessage } from './course-builder-config';

describe('firstCourseFormErrorMessage', () => {
  it('encontra a mensagem específica dentro de erros aninhados do currículo', () => {
    expect(
      firstCourseFormErrorMessage({
        modulos: [{ itens: [{ imagens: [{ alt: { message: 'Descreve a imagem.' } }] }] }],
      })
    ).toBe('Descreve a imagem.');
  });

  it('devolve uma estrutura inicial independente para cada curso sem módulos', () => {
    const curso: Curso = {
      id: 'curso-1',
      slug: 'curso-1',
      titulo: 'Curso vazio',
      descricao: 'Curso ainda sem módulos persistidos.',
      autorId: 'mentor-1',
      totalHoras: 0,
      estado: 'draft',
      rating: 0,
      inscritosCount: 0,
      createdAt: '2026-09-08T08:00:00.000Z',
      updatedAt: '2026-09-08T08:00:00.000Z',
      modulos: [],
    };

    const first = courseToFormValues(curso);
    const second = courseToFormValues(curso);
    const firstModule = first.modulos[0];
    const secondModule = second.modulos[0];
    if (!firstModule || !secondModule) throw new Error('Configuração inicial sem módulo');

    firstModule.titulo = 'Alterado apenas localmente';
    firstModule.itens[0]!.titulo = 'Aula alterada apenas localmente';

    expect(secondModule.titulo).not.toBe(firstModule.titulo);
    expect(secondModule.itens[0]?.titulo).not.toBe(firstModule.itens[0]?.titulo);
  });
});
