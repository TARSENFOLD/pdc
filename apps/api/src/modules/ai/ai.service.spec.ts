import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  strapiGet: vi.fn(),
  calcularPerfil: vi.fn(),
  obterVersoesCurso: vi.fn(),
  loadSimulacaoVersions: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('pino', () => ({
  default: vi.fn(() => ({ warn: mocks.warn, error: mocks.error })),
}));

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: mocks.strapiGet,
}));

vi.mock('../vocacional/vocacional.service.js', () => ({
  vocacionalService: { calcularPerfil: mocks.calcularPerfil },
}));

vi.mock('../cursos/cursos.service.js', () => ({
  cursosService: { obterVersoesCurso: mocks.obterVersoesCurso },
}));

vi.mock('../simulacoes/simulacao-access.repository.js', () => ({
  loadSimulacaoVersions: mocks.loadSimulacaoVersions,
}));

import { aiService } from './ai.service.js';

function contentVersion(input: {
  documentId: string;
  titulo: string;
  estado: 'draft' | 'review' | 'approved' | 'hidden' | 'archived';
}) {
  return {
    id: 1,
    documentId: input.documentId,
    titulo: input.titulo,
    autorId: 'author-1',
    estado: input.estado,
    tipo: 1,
    area: 'TECNOLOGIA',
  };
}

function configureRelations(options: { course?: boolean; simulation?: boolean } = {}): void {
  mocks.strapiGet.mockImplementation((path: string) => {
    if (path === '/tentativas') {
      return Promise.resolve({
        data: options.simulation
          ? [{
            id: 1,
            simulacao: {
              id: 10,
              documentId: 'sim-1',
              titulo: 'Título populado não autorizado',
            },
          }]
          : [],
      });
    }
    if (path === '/inscricoes') {
      return Promise.resolve({
        data: options.course
          ? [{
            id: 2,
            curso: {
              id: 20,
              documentId: 'course-1',
              titulo: 'Curso populado não autorizado',
            },
          }]
          : [],
      });
    }
    return Promise.reject(new Error('Unexpected Strapi path'));
  });
}

describe('aiService.buildContexto — contenção de conteúdo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calcularPerfil.mockResolvedValue({
      scoreGlobal: 8,
      aptidao: 7,
      dedicacao: 9,
    });
    configureRelations();
  });

  it('inclui somente títulos das versões published e approved', async () => {
    configureRelations({ course: true, simulation: true });
    mocks.obterVersoesCurso.mockResolvedValue({
      current: contentVersion({
        documentId: 'course-1',
        titulo: 'Rascunho privado do Curso',
        estado: 'review',
      }),
      published: contentVersion({
        documentId: 'course-1',
        titulo: 'Curso Público Aprovado',
        estado: 'approved',
      }),
    });
    mocks.loadSimulacaoVersions.mockResolvedValue({
      current: contentVersion({
        documentId: 'sim-1',
        titulo: 'Edição privada da Simulação',
        estado: 'draft',
      }),
      published: contentVersion({
        documentId: 'sim-1',
        titulo: 'Simulação Pública Aprovada',
        estado: 'approved',
      }),
    });

    const contexto = await aiService.buildContexto({ id: 'student-1', role: 'estudante' });

    expect(contexto).toContain('Curso Público Aprovado');
    expect(contexto).toContain('Simulação Pública Aprovada');
    expect(contexto).not.toContain('Rascunho privado do Curso');
    expect(contexto).not.toContain('Edição privada da Simulação');
    expect(contexto).not.toContain('Título populado não autorizado');
    expect(contexto).not.toContain('Curso populado não autorizado');
    expect(mocks.strapiGet).toHaveBeenCalledWith('/tentativas', expect.objectContaining({
      'filters[perfil][userId][$eq]': 'student-1',
    }));
    expect(mocks.strapiGet).toHaveBeenCalledWith('/inscricoes', expect.objectContaining({
      'filters[perfil][userId][$eq]': 'student-1',
    }));
  });

  it('bloqueia um Curso privado sem expor o título populado', async () => {
    configureRelations({ course: true });
    mocks.obterVersoesCurso.mockResolvedValue({
      current: contentVersion({
        documentId: 'course-1',
        titulo: 'Curso Privado Confidencial',
        estado: 'draft',
      }),
    });

    await expect(
      aiService.buildContexto({ id: 'student-1', role: 'estudante' }),
    ).rejects.toMatchObject({ decision: 'content_not_found' });
    expect(JSON.stringify(mocks.warn.mock.calls)).not.toContain('Curso Privado Confidencial');
    expect(JSON.stringify(mocks.error.mock.calls)).not.toContain('Curso Privado Confidencial');
  });

  it('bloqueia uma Simulação privada sem expor o título populado', async () => {
    configureRelations({ simulation: true });
    mocks.loadSimulacaoVersions.mockResolvedValue({
      current: contentVersion({
        documentId: 'sim-1',
        titulo: 'Simulação Privada Confidencial',
        estado: 'review',
      }),
    });

    await expect(
      aiService.buildContexto({ id: 'student-1', role: 'estudante' }),
    ).rejects.toMatchObject({ decision: 'content_not_found' });
    expect(JSON.stringify(mocks.warn.mock.calls)).not.toContain('Simulação Privada Confidencial');
    expect(JSON.stringify(mocks.error.mock.calls)).not.toContain('Simulação Privada Confidencial');
  });

  it.each(['hidden', 'archived'] as const)(
    'devolve decisão de indisponibilidade para relação existente em estado %s',
    async (estado) => {
      configureRelations({ course: true });
      mocks.obterVersoesCurso.mockResolvedValue({
        current: contentVersion({
          documentId: 'course-1',
          titulo: 'Título privado que não pode aparecer',
          estado,
        }),
        published: contentVersion({
          documentId: 'course-1',
          titulo: 'Título publicado anterior',
          estado: 'approved',
        }),
      });

      await expect(
        aiService.buildContexto({ id: 'student-1', role: 'estudante' }),
      ).rejects.toMatchObject({
        decision: 'content_not_available',
      });
      const publicLogs = JSON.stringify([
        ...mocks.warn.mock.calls,
        ...mocks.error.mock.calls,
      ]);
      expect(publicLogs).not.toContain('Título privado que não pode aparecer');
      expect(publicLogs).not.toContain(estado);
    },
  );

  it('transporta falha do Strapi como decisão tipada de dependência', async () => {
    mocks.strapiGet.mockRejectedValue(new Error('Strapi indisponível'));

    await expect(
      aiService.buildContexto({ id: 'student-1', role: 'estudante' }),
    ).rejects.toMatchObject({
      decision: 'dependency_unavailable',
    });
  });
});
