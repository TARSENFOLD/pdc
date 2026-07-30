import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  strapiGet: vi.fn(),
  warn: vi.fn(),
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
vi.mock('pino', () => ({
  default: vi.fn(() => ({ warn: mocks.warn })),
}));

import { aiRag } from './ai.rag.js';

beforeEach(() => {
  mocks.redisGet.mockReset();
  mocks.redisSet.mockReset();
  mocks.redisSet.mockResolvedValue('OK');
  mocks.strapiGet.mockReset();
  mocks.warn.mockReset();
});

describe('AI RAG cache', () => {
  it('indexa conteúdo estruturado no Redis primário', async () => {
    mocks.strapiGet
      .mockResolvedValueOnce({ data: [{ id: 1, titulo: 'Curso A', descricao: 'Descrição A' }] })
      .mockResolvedValueOnce({ data: [{ id: 2, titulo: 'Experiência B', descricao: 'Descrição B' }] });

    await aiRag.indexarConteudo();

    expect(mocks.redisSet).toHaveBeenCalledWith('rag:conteudo', [
      { id: '1', titulo: 'Curso A', descricao: 'Descrição A', tipo: 'curso' },
      { id: '2', titulo: 'Experiência B', descricao: 'Descrição B', tipo: 'experiencia' },
    ]);
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
});
