import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  strapiGet: vi.fn(),
  isEnabled: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../lib/redis.js', () => ({
  hasPrimaryRedis: true,
  redis: {
    get: mocks.redisGet,
    set: mocks.redisSet,
  },
}));
vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: mocks.strapiGet,
}));
vi.mock('../feature-flags/feature-flags.service.js', () => ({
  featureFlagService: {
    isEnabled: mocks.isEnabled,
  },
}));
vi.mock('pino', () => ({
  default: vi.fn(() => ({ warn: mocks.warn, error: mocks.error })),
}));

import { aiRag } from './ai.rag.js';

beforeEach(() => {
  mocks.redisGet.mockReset();
  mocks.redisSet.mockReset();
  mocks.redisSet.mockResolvedValue('OK');
  mocks.strapiGet.mockReset();
  mocks.isEnabled.mockReset();
  mocks.isEnabled.mockResolvedValue(true);
  mocks.warn.mockReset();
  mocks.error.mockReset();
});

describe('AI RAG cache', () => {
  it('indexa Curso e Institucional, mas não VWX quando o catálogo está desligado', async () => {
    mocks.isEnabled.mockResolvedValue(false);
    mocks.strapiGet
      .mockResolvedValueOnce({ data: [{ id: 1, titulo: 'Curso A', descricao: 'Descrição A' }] })
      .mockResolvedValueOnce({
        data: [
          {
            id: 2,
            titulo: 'Experiência Institucional',
            descricao: 'Descrição institucional',
            tipoExperiencia: 'institucional',
          },
          {
            id: 3,
            titulo: 'Experiência Imersiva',
            descricao: 'Descrição VWX',
            tipoExperiencia: 'vwx',
          },
        ],
      });

    await aiRag.indexarConteudo();

    expect(mocks.redisSet).toHaveBeenCalledWith('rag:conteudo:v2', [
      { id: '1', titulo: 'Curso A', descricao: 'Descrição A', tipo: 'curso' },
      {
        id: '2',
        titulo: 'Experiência Institucional',
        descricao: 'Descrição institucional',
        tipo: 'experiencia',
        tipoExperiencia: 'institucional',
      },
    ]);
    expect(mocks.isEnabled).toHaveBeenCalledWith('vwx_catalog_enabled');
  });

  it('devolve contexto apenas para itens validados', async () => {
    mocks.redisGet.mockResolvedValue([
      { id: '1', titulo: 'Engenharia de Software', descricao: 'Arquitetura de sistemas', tipo: 'curso' },
    ]);

    await expect(aiRag.buscarContextoRelevante('arquitetura')).resolves.toContain(
      '[curso] Engenharia de Software: Arquitetura de sistemas',
    );
  });

  it('normaliza payload JSON serializado pelo adaptador Redis', async () => {
    mocks.redisGet.mockResolvedValueOnce(JSON.stringify([
      {
        id: '1',
        titulo: 'Engenharia de Software',
        descricao: 'Arquitetura de sistemas',
        tipo: 'curso',
      },
    ]));

    await expect(aiRag.buscarContextoRelevante('arquitetura')).resolves.toContain(
      '[curso] Engenharia de Software: Arquitetura de sistemas',
    );
  });

  it('continua sem contexto quando o cache falha ou contém payload inválido', async () => {
    mocks.redisGet.mockRejectedValueOnce(new Error('Redis indisponível'));
    await expect(aiRag.buscarContextoRelevante('arquitetura')).resolves.toBe('');

    mocks.redisGet.mockResolvedValueOnce([{ id: 1, titulo: 'Inválido' }]);
    await expect(aiRag.buscarContextoRelevante('arquitetura')).resolves.toBe('');

    mocks.redisGet.mockResolvedValueOnce('{invalid-json');
    await expect(aiRag.buscarContextoRelevante('arquitetura')).resolves.toBe('');
    expect(mocks.warn).toHaveBeenCalledTimes(3);
  });

  it('filtra VWX de um índice já criado quando o flag é desligado', async () => {
    mocks.isEnabled.mockResolvedValue(false);
    mocks.redisGet.mockResolvedValue([
      {
        id: 'curso-1',
        titulo: 'Curso de Arquitectura',
        descricao: 'Arquitectura aplicada',
        tipo: 'curso',
      },
      {
        id: 'inst-1',
        titulo: 'Experiência Institucional',
        descricao: 'Arquitectura universitária',
        tipo: 'experiencia',
        tipoExperiencia: 'institucional',
      },
      {
        id: 'vwx-1',
        titulo: 'Experiência Imersiva',
        descricao: 'Arquitectura em ambiente VWX',
        tipo: 'experiencia',
        tipoExperiencia: 'vwx',
      },
    ]);

    const context = await aiRag.buscarContextoRelevante('arquitectura');

    expect(context).toContain('[curso] Curso de Arquitectura');
    expect(context).toContain('[experiencia] Experiência Institucional');
    expect(context).not.toContain('Experiência Imersiva');
  });

  it('permite VWX na pesquisa quando o flag está ligado', async () => {
    mocks.redisGet.mockResolvedValue([
      {
        id: 'vwx-1',
        titulo: 'Experiência Imersiva',
        descricao: 'Laboratório de arquitectura imersiva',
        tipo: 'experiencia',
        tipoExperiencia: 'vwx',
      },
    ]);

    await expect(aiRag.buscarContextoRelevante('arquitectura')).resolves.toContain(
      '[experiencia] Experiência Imersiva',
    );
  });

  it('oculta VWX quando o registry falha e mantém conteúdo não VWX', async () => {
    mocks.isEnabled.mockRejectedValue(new Error('Registry indisponível'));
    mocks.redisGet.mockResolvedValue([
      {
        id: 'curso-1',
        titulo: 'Curso de Engenharia',
        descricao: 'Engenharia aplicada',
        tipo: 'curso',
      },
      {
        id: 'inst-1',
        titulo: 'Experiência Institucional',
        descricao: 'Engenharia no campus',
        tipo: 'experiencia',
        tipoExperiencia: 'institucional',
      },
      {
        id: 'vwx-1',
        titulo: 'Experiência Empresarial',
        descricao: 'Engenharia imersiva',
        tipo: 'experiencia',
        tipoExperiencia: 'vwx',
      },
    ]);

    const context = await aiRag.buscarContextoRelevante('engenharia');

    expect(context).toContain('Curso de Engenharia');
    expect(context).toContain('Experiência Institucional');
    expect(context).not.toContain('Experiência Empresarial');
  });

  it('não consome o índice antigo sem discriminante', async () => {
    mocks.redisGet.mockImplementation((key: string) => (
      key === 'rag:conteudo'
        ? [{ id: 'legacy', titulo: 'VWX legado', descricao: 'Arquitectura', tipo: 'experiencia' }]
        : null
    ));

    await expect(aiRag.buscarContextoRelevante('arquitectura')).resolves.toBe('');
    expect(mocks.redisGet).toHaveBeenCalledOnce();
    expect(mocks.redisGet).toHaveBeenCalledWith('rag:conteudo:v2');
  });

  it('classifica VWX apenas pelo discriminante, nunca pelo título ou conteúdo', async () => {
    mocks.isEnabled.mockResolvedValue(false);
    mocks.redisGet.mockResolvedValue([
      {
        id: 'inst-vwx-title',
        titulo: 'VWX no título institucional',
        descricao: 'Laboratório institucional',
        tipo: 'experiencia',
        tipoExperiencia: 'institucional',
      },
      {
        id: 'vwx-neutral-title',
        titulo: 'Laboratório Empresarial',
        descricao: 'Percurso profissional',
        tipo: 'experiencia',
        tipoExperiencia: 'vwx',
      },
    ]);

    const context = await aiRag.buscarContextoRelevante('laboratório');

    expect(context).toContain('VWX no título institucional');
    expect(context).not.toContain('Laboratório Empresarial');
  });
});
