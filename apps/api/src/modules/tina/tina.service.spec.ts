import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('../../lib/redis.js', () => ({
  hasPrimaryRedis: true,
  upstashRedis: null,
  redis: {
    get: mocks.redisGet,
    set: mocks.redisSet,
  },
}));
vi.mock('pino', () => ({
  default: vi.fn(() => ({ warn: mocks.warn })),
}));

import { TINA_KNOWLEDGE } from './tina.knowledge.js';
import { extractJsonObject, tinaService } from './tina.service.js';

beforeEach(() => {
  mocks.redisGet.mockReset();
  mocks.redisSet.mockReset();
  mocks.redisSet.mockResolvedValue('OK');
  mocks.warn.mockReset();
});

describe('extractJsonObject', () => {
  it('extrai JSON mesmo quando a IA devolve markdown', () => {
    const parsed = extractJsonObject('```json\n{"area":"Tecnologia","score":82}\n```');

    expect(parsed).toEqual({ area: 'Tecnologia', score: 82 });
  });

  it('devolve null quando não há objeto JSON', () => {
    expect(extractJsonObject('sem json aqui')).toBeNull();
  });

  it('propaga erro de JSON inválido para o chamador decidir fallback', () => {
    expect(() => extractJsonObject('{"area":}')).toThrow();
  });

  it('ignora JSON que não contenha um objeto literal', () => {
    expect(extractJsonObject('["não", "objeto"]')).toBeNull();
  });
});

describe('cache de conhecimento Tina', () => {
  it('indexa objetos tipados no Redis primário', async () => {
    await tinaService.indexarKnowledge();

    expect(mocks.redisSet).toHaveBeenCalledTimes(TINA_KNOWLEDGE.length);
    expect(mocks.redisSet).toHaveBeenNthCalledWith(1, 'tina:kb:0', TINA_KNOWLEDGE[0]);
  });

  it('consulta apenas as chaves determinísticas conhecidas', async () => {
    mocks.redisGet.mockImplementation((key: string) => Promise.resolve(
      key === 'tina:kb:1' ? TINA_KNOWLEDGE[1] : null,
    ));

    await expect(tinaService.buscarChunks('simulações práticas')).resolves.toContain('Simulações:');
    expect(mocks.redisGet).toHaveBeenCalledTimes(TINA_KNOWLEDGE.length);
  });

  it('continua sem chunks quando o cache primário falha', async () => {
    mocks.redisGet.mockRejectedValueOnce(new Error('Redis indisponível'));

    await expect(tinaService.buscarChunks('simulações')).resolves.toBe('');
    expect(mocks.warn).toHaveBeenCalledOnce();
  });
});
