import { describe, expect, it } from 'vitest';
import { avaliarProntidaoCurso } from '@pdc/shared';
import {
  cumulativeCompletedReadinessSteps,
  findBlockingReadinessStep,
} from './course-readiness-navigation';

const steps = [{ id: 'info' }, { id: 'curriculum' }, { id: 'merit' }, { id: 'review' }] as const;
const readinessSteps = ['info', 'curriculum', 'merit'] as const;

function readinessFor(overrides: Parameters<typeof avaliarProntidaoCurso>[0] = {}) {
  return avaliarProntidaoCurso({
    titulo: 'Curso completo',
    descricao: 'Descrição suficientemente completa.',
    area: 'ENGENHARIA',
    nivel: 'medio',
    capaUrl: 'https://cdn.example.com/capa.webp',
    visibilidade: 'publico',
    gratuito: true,
    modulos: [{ titulo: 'Módulo inicial', itens: [{ titulo: 'Primeira aula', tipo: 'texto', conteudo: 'Conteúdo completo da aula.', ordem: 1 }] }],
    ...overrides,
  });
}

describe('findBlockingReadinessStep', () => {
  it('bloqueia a passagem de Básico para Currículo quando falta a identidade', () => {
    expect(findBlockingReadinessStep({
      activeStep: 'info',
      targetStep: 'curriculum',
      steps,
      readinessSteps,
      readiness: readinessFor({ titulo: '', descricao: '', capaUrl: undefined }),
    })).toBe('info');
  });

  it('leva ao primeiro passo incompleto quando se tenta saltar para Revisão', () => {
    expect(findBlockingReadinessStep({
      activeStep: 'curriculum',
      targetStep: 'review',
      steps,
      readinessSteps,
      readiness: readinessFor({ modulos: [{ titulo: 'Módulo vazio', itens: [] }] }),
    })).toBe('curriculum');
  });

  it('permite voltar e avançar quando os passos anteriores estão completos', () => {
    const readiness = readinessFor();
    expect(findBlockingReadinessStep({ activeStep: 'merit', targetStep: 'info', steps, readinessSteps, readiness })).toBeUndefined();
    expect(findBlockingReadinessStep({ activeStep: 'info', targetStep: 'review', steps, readinessSteps, readiness })).toBeUndefined();
  });
});

describe('cumulativeCompletedReadinessSteps', () => {
  it('não marca uma etapa futura enquanto uma anterior estiver incompleta', () => {
    const readiness = readinessFor({ titulo: '', descricao: '', capaUrl: undefined });

    expect(readiness.byStep.merit.complete).toBe(true);
    expect(cumulativeCompletedReadinessSteps(readinessSteps, readiness)).toEqual([]);
  });

  it('marca apenas a sequência concluída desde o primeiro passo', () => {
    const readiness = readinessFor({ modulos: [{ titulo: 'Módulo vazio', itens: [] }] });

    expect(cumulativeCompletedReadinessSteps(readinessSteps, readiness)).toEqual(['info']);
  });
});
