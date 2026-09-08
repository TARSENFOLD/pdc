import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  avaliarProntidaoCurso,
  CriarCursoPayloadSchema,
  CURSO_DESCRICAO_MAX_LENGTH,
  CURSO_ITEM_IMAGEM_ALT_MAX_LENGTH,
} from './cursos.js';

type CoursePayloadInput = z.input<typeof CriarCursoPayloadSchema>;

function validCourse(): CoursePayloadInput {
  return {
    titulo: 'Curso de produto digital',
    descricao: 'Descrição completa e válida para o curso.',
    area: 'TECNOLOGIA',
    nivel: 'medio',
    regrasAcesso: {},
    modulos: [{
      titulo: 'Introdução',
      ordem: 1,
      itens: [{ titulo: 'Boas-vindas', tipo: 'texto', ordem: 1 }],
    }],
  };
}

function firstModule(course: CoursePayloadInput) {
  const module = course.modulos[0];
  if (!module) throw new Error('Fixture de curso sem módulo');
  return module;
}

describe('CriarCursoPayloadSchema — composição de mídia', () => {
  it('orienta em português quando a identidade do curso está incompleta', () => {
    const result = CriarCursoPayloadSchema.safeParse({ ...validCourse(), titulo: '', descricao: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: ['titulo'], message: 'Adiciona um título com pelo menos 3 caracteres.' }),
        expect.objectContaining({ path: ['descricao'], message: 'Escreve uma descrição com pelo menos 10 caracteres.' }),
      ]));
    }
  });

  it('rejeita descrição e texto alternativo acima dos limites editoriais', () => {
    const course = validCourse();
    course.descricao = 'd'.repeat(CURSO_DESCRICAO_MAX_LENGTH + 1);
    firstModule(course).itens = [{
      titulo: 'Aula ilustrada',
      tipo: 'texto',
      ordem: 1,
      imagens: [{
        url: 'https://cdn.example.com/aula.webp',
        alt: 'a'.repeat(CURSO_ITEM_IMAGEM_ALT_MAX_LENGTH + 1),
      }],
    }];

    const result = CriarCursoPayloadSchema.safeParse(course);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          path: ['descricao'],
          message: `A descrição pode ter no máximo ${String(CURSO_DESCRICAO_MAX_LENGTH)} caracteres.`,
        }),
        expect.objectContaining({
          path: ['modulos', 0, 'itens', 0, 'imagens', 0, 'alt'],
          message: `A descrição acessível pode ter no máximo ${String(CURSO_ITEM_IMAGEM_ALT_MAX_LENGTH)} caracteres.`,
        }),
      ]));
    }
  });

  it('aceita módulo vazio no payload de rascunho, mas não o considera pronto', () => {
    const course = validCourse();
    firstModule(course).itens = [];

    expect(CriarCursoPayloadSchema.safeParse({ ...course, estado: 'draft' }).success).toBe(true);
    expect(avaliarProntidaoCurso(course).ready).toBe(false);
  });

  it.each(['quiz', 'tarefa'] as const)(
    'mantém %s fora da publicação até existir um modelo funcional tipado',
    (tipo) => {
      const course = validCourse();
      firstModule(course).itens = [{
        titulo: `Aula de ${tipo}`,
        tipo,
        conteudo: 'Conteúdo genérico que não substitui a configuração funcional.',
        ordem: 1,
      }];

      const readiness = avaliarProntidaoCurso({
        ...course,
        capaUrl: 'https://cdn.example.com/capa.webp',
      });
      expect(readiness.ready).toBe(false);
      expect(readiness.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          path: 'modulos.0.itens.0.tipo',
          message: `O formato ${tipo === 'quiz' ? 'Quiz' : 'Tarefa'} ainda não está disponível para publicação.`,
        }),
      ]));
    },
  );

  it('rejeita moeda numérica mesmo quando tem três caracteres', () => {
    const readiness = avaliarProntidaoCurso({
      ...validCourse(),
      capaUrl: 'https://cdn.example.com/capa.webp',
      gratuito: false,
      preco: 10,
      moeda: '123',
    });

    expect(readiness.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'moeda', message: 'Indica uma moeda válida com 3 letras.' }),
    ]));
  });

  it('aceita um vídeo na primeira posição e uma galeria acessível numa aula', () => {
    const course = validCourse();
    firstModule(course).itens = [
      { titulo: 'Vídeo de abertura', tipo: 'video', ordem: 1 },
      {
        titulo: 'Conceitos principais',
        tipo: 'texto',
        ordem: 2,
        imagens: [
          { url: 'https://cdn.example.com/um.webp', alt: 'Estudantes a colaborar' },
          { url: 'https://cdn.example.com/dois.webp', alt: 'Quadro com o plano do projeto' },
        ],
      },
    ];

    expect(CriarCursoPayloadSchema.safeParse(course).success).toBe(true);
  });

  it('rejeita mais de um vídeo no mesmo módulo', () => {
    const course = validCourse();
    firstModule(course).itens = [
      { titulo: 'Primeiro vídeo', tipo: 'video', ordem: 1 },
      { titulo: 'Segundo vídeo', tipo: 'video', ordem: 2 },
    ];

    const result = CriarCursoPayloadSchema.safeParse(course);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.message.includes('no máximo um vídeo'))).toBe(true);
  });

  it('rejeita vídeo fora da primeira posição', () => {
    const course = validCourse();
    firstModule(course).itens = [
      { titulo: 'Leitura inicial', tipo: 'texto', ordem: 1 },
      { titulo: 'Vídeo tardio', tipo: 'video', ordem: 2 },
    ];

    const result = CriarCursoPayloadSchema.safeParse(course);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.message.includes('primeiro conteúdo'))).toBe(true);
  });

  it('usa a ordem persistida mesmo quando o array chega fora de ordem', () => {
    const course = validCourse();
    firstModule(course).itens = [
      { titulo: 'Vídeo tardio', tipo: 'video', ordem: 2 },
      { titulo: 'Leitura inicial', tipo: 'texto', ordem: 1 },
    ];

    const result = CriarCursoPayloadSchema.safeParse(course);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.message.includes('primeiro conteúdo'))).toBe(true);
  });

  it('rejeita uma primeira ordem ambígua entre vídeo e texto', () => {
    const course = validCourse();
    firstModule(course).itens = [
      { titulo: 'Leitura inicial', tipo: 'texto', ordem: 1 },
      { titulo: 'Vídeo de abertura', tipo: 'video', ordem: 1 },
    ];

    const result = CriarCursoPayloadSchema.safeParse(course);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.message.includes('primeiro conteúdo'))).toBe(true);
  });

  it('rejeita posições duplicadas mesmo quando o módulo não tem vídeo', () => {
    const course = validCourse();
    firstModule(course).itens = [
      { titulo: 'Primeira leitura', tipo: 'texto', ordem: 1 },
      { titulo: 'Segunda leitura', tipo: 'texto', ordem: 1 },
    ];

    const result = CriarCursoPayloadSchema.safeParse(course);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.message.includes('posição única'))).toBe(true);
  });

  it('rejeita módulos com a mesma posição', () => {
    const course = validCourse();
    course.modulos.push({
      titulo: 'Segundo módulo',
      ordem: 1,
      itens: [{ titulo: 'Outra aula', tipo: 'texto', ordem: 1 }],
    });

    const result = CriarCursoPayloadSchema.safeParse(course);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          path: ['modulos', 1, 'ordem'],
          message: 'Cada módulo deve ter uma posição única no curso.',
        }),
      ]));
    }
  });

  it('permite guardar mídia HTTP em rascunho e deixa a prontidão bloquear publicação insegura', () => {
    const external = validCourse();
    firstModule(external).itens = [{
      titulo: 'Documento externo',
      tipo: 'pdf',
      url: 'http://example.com/material.pdf',
      ordem: 1,
    }];
    const local = validCourse();
    firstModule(local).itens = [{
      titulo: 'Documento local',
      tipo: 'pdf',
      url: 'http://localhost:3001/media/local/material.pdf',
      ordem: 1,
    }];

    const persistedExternal = CriarCursoPayloadSchema.parse(external);
    const persistedLocal = CriarCursoPayloadSchema.parse(local);
    expect(avaliarProntidaoCurso({ ...persistedExternal, capaUrl: 'https://cdn.example.com/capa.webp' }).ready).toBe(false);
    expect(avaliarProntidaoCurso({ ...persistedLocal, capaUrl: 'https://cdn.example.com/capa.webp' }).ready).toBe(false);
    expect(avaliarProntidaoCurso(
      { ...persistedLocal, capaUrl: 'https://cdn.example.com/capa.webp' },
      { allowLocalHttp: true },
    ).ready).toBe(true);
  });
});

describe('avaliarProntidaoCurso', () => {
  const readyCourse = {
    titulo: 'Introdução à engenharia',
    descricao: 'Um percurso prático para aprender fundamentos de engenharia.',
    area: 'ENGENHARIA',
    nivel: 'medio',
    capaUrl: 'https://cdn.example.com/capa.webp',
    visibilidade: 'publico',
    gratuito: true,
    preco: 0,
    moeda: 'AOA',
    modulos: [{
      titulo: 'Fundamentos',
      itens: [{ titulo: 'Conceitos essenciais', tipo: 'texto', conteudo: 'Conteúdo completo da primeira aula.', ordem: 1 }],
    }],
  };

  it('considera pronto um curso com identidade, capa, currículo e acesso completos', () => {
    expect(avaliarProntidaoCurso(readyCourse)).toEqual({
      ready: true,
      issues: [],
      byStep: {
        info: { complete: true, issues: [] },
        curriculum: { complete: true, issues: [] },
        merit: { complete: true, issues: [] },
      },
    });
  });

  it('aplica os defaults público e gratuito quando esses campos são omitidos', () => {
    expect(avaliarProntidaoCurso({
      ...readyCourse,
      visibilidade: undefined,
      gratuito: undefined,
    }).ready).toBe(true);
  });

  it('aceita thumbnail persistida quando capaUrl está vazia', () => {
    expect(avaliarProntidaoCurso({
      ...readyCourse,
      capaUrl: '',
      thumbnailUrl: 'https://cdn.example.com/capa-persistida.webp',
    }).byStep.info.complete).toBe(true);
  });

  it('bloqueia curso vazio e identifica cada etapa incompleta', () => {
    const result = avaliarProntidaoCurso({
      titulo: '',
      descricao: '',
      area: 'ENGENHARIA',
      nivel: 'medio',
      visibilidade: 'publico',
      gratuito: true,
      modulos: [{ titulo: 'Módulo 1', itens: [{ titulo: 'Bem-vindo', tipo: 'texto', ordem: 1 }] }],
    });

    expect(result.ready).toBe(false);
    expect(result.byStep.info.issues.map((issue) => issue.path)).toEqual(['titulo', 'descricao', 'capaUrl']);
    expect(result.byStep.curriculum.issues.map((issue) => issue.path)).toEqual(['modulos.0.itens.0.conteudo']);
    expect(result.byStep.merit.complete).toBe(true);
  });

  it('bloqueia a submissão de um módulo sem aulas', () => {
    const result = avaliarProntidaoCurso({
      ...readyCourse,
      modulos: [{ titulo: 'Módulo em construção', itens: [] }],
    });

    expect(result.ready).toBe(false);
    expect(result.byStep.curriculum.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'modulos.0.itens' }),
    ]));
  });

  it('exige origem para vídeo e preço coerente num curso pago', () => {
    const result = avaliarProntidaoCurso({
      ...readyCourse,
      gratuito: false,
      preco: 0,
      moeda: '',
      modulos: [{ titulo: 'Vídeos', itens: [{ titulo: 'Abertura', tipo: 'video', ordem: 1 }] }],
    });

    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'modulos.0.itens.0.videoId' }),
      expect.objectContaining({ path: 'preco' }),
      expect.objectContaining({ path: 'moeda' }),
    ]));
  });

  it('bloqueia mais de um vídeo e vídeo fora da primeira posição', () => {
    const multipleVideos = avaliarProntidaoCurso({
      ...readyCourse,
      modulos: [{
        titulo: 'Vídeos',
        itens: [
          { titulo: 'Primeiro vídeo', tipo: 'video', videoId: 'video-1', ordem: 1 },
          { titulo: 'Segundo vídeo', tipo: 'video', videoId: 'video-2', ordem: 2 },
        ],
      }],
    });
    const lateVideo = avaliarProntidaoCurso({
      ...readyCourse,
      modulos: [{
        titulo: 'Sequência',
        itens: [
          { titulo: 'Leitura inicial', tipo: 'texto', conteudo: 'Conteúdo completo da leitura.', ordem: 1 },
          { titulo: 'Vídeo tardio', tipo: 'video', videoId: 'video-1', ordem: 2 },
        ],
      }],
    });

    expect(multipleVideos.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'modulos.0.itens' }),
    ]));
    expect(lateVideo.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'modulos.0.itens.1' }),
    ]));
  });

  it('bloqueia posições duplicadas e mídia HTTP externa na prontidão', () => {
    const result = avaliarProntidaoCurso({
      ...readyCourse,
      modulos: [{
        titulo: 'Materiais',
        itens: [
          { titulo: 'Documento um', tipo: 'pdf', url: 'https://cdn.example.com/um.pdf', ordem: 1 },
          { titulo: 'Documento dois', tipo: 'pdf', url: 'http://example.com/dois.pdf', ordem: 1 },
        ],
      }],
    });

    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'modulos.0.itens' }),
      expect.objectContaining({ path: 'modulos.0.itens.1.url' }),
    ]));
  });

  it('bloqueia galeria HTTP externa na prontidão sem impedir o rascunho', () => {
    const course = validCourse();
    firstModule(course).itens = [{
      titulo: 'Leitura ilustrada',
      tipo: 'texto',
      conteudo: 'Conteúdo completo da leitura ilustrada.',
      imagens: [{ url: 'http://example.com/imagem.webp', alt: 'Diagrama do conteúdo' }],
      ordem: 1,
    }];

    const persistedCourse = CriarCursoPayloadSchema.parse(course);
    const result = avaliarProntidaoCurso({ ...persistedCourse, capaUrl: 'https://cdn.example.com/capa.webp' });
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'modulos.0.itens.0.imagens.0.url' }),
    ]));
  });

  it('não declara o currículo pronto quando falta a descrição acessível de uma imagem', () => {
    const result = avaliarProntidaoCurso({
      ...readyCourse,
      modulos: [{
        titulo: 'Leitura ilustrada',
        itens: [{
          titulo: 'Aula ilustrada',
          tipo: 'texto',
          conteudo: 'Conteúdo completo da aula ilustrada.',
          imagens: [{ url: 'https://cdn.example.com/imagem.webp', alt: '' }],
          ordem: 1,
        }],
      }],
    });

    expect(result.byStep.curriculum.complete).toBe(false);
    expect(result.byStep.curriculum.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: 'modulos.0.itens.0.imagens.0.alt',
        message: 'Descreve a imagem 1 da aula 1.1.',
      }),
    ]));
  });

  it('reporta uma galeria legada malformada sem lançar erro', () => {
    const result = avaliarProntidaoCurso({
      ...readyCourse,
      modulos: [{
        titulo: 'Leitura legada',
        itens: [{
          titulo: 'Aula legada',
          tipo: 'texto',
          conteudo: 'Conteúdo válido com uma galeria antiga inválida.',
          imagens: [{ url: 'https://cdn.example.com/imagem.webp' }],
          ordem: 1,
        }],
      }],
    });

    expect(result.byStep.curriculum.complete).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'modulos.0.itens.0.imagens.0.alt' }),
    ]));
  });

  it.each([undefined, 'audio'])('rejeita formato de aula ausente ou desconhecido: %s', (tipo) => {
    const result = avaliarProntidaoCurso({
      ...readyCourse,
      modulos: [{ titulo: 'Formato', itens: [{ titulo: 'Aula inválida', tipo, conteudo: 'Conteúdo suficiente.', ordem: 1 }] }],
    });

    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'modulos.0.itens.0.tipo' }),
    ]));
  });
});
