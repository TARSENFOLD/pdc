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

  it('normaliza uma galeria nula do CMS antes de validar e guardar novamente', () => {
    const curso: Curso = {
      id: 'curso-1',
      slug: 'curso-1',
      titulo: 'Curso com aula',
      descricao: 'Curso persistido com galeria nula no CMS.',
      autorId: 'mentor-1',
      totalHoras: 1,
      estado: 'draft',
      rating: 0,
      inscritosCount: 0,
      createdAt: '2026-09-08T08:00:00.000Z',
      updatedAt: '2026-09-08T08:00:00.000Z',
      modulos: [
        {
          id: 'modulo-1',
          titulo: 'Introdução',
          ordem: 1,
          itens: [
            {
              id: 'item-1',
              titulo: 'Aula inicial',
              tipo: 'texto',
              ordem: 1,
              imagens: null,
            },
          ],
        },
      ],
    };

    expect(courseToFormValues(curso).modulos[0]?.itens[0]?.imagens).toBeUndefined();
  });

  it('não mistura o estado editorial com os campos editáveis do formulário', () => {
    const curso: Curso = {
      id: 'curso-1',
      slug: 'curso-1',
      titulo: 'Curso em revisão',
      descricao: 'Curso que já foi submetido para revisão.',
      autorId: 'mentor-1',
      totalHoras: 1,
      estado: 'review',
      rating: 0,
      inscritosCount: 0,
      createdAt: '2026-09-08T08:00:00.000Z',
      updatedAt: '2026-09-08T08:00:00.000Z',
      modulos: [],
    };

    expect(courseToFormValues(curso)).not.toHaveProperty('estado');
  });
});
