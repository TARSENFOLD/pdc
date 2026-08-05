import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  aiChat: vi.fn(),
  primaryEnabled: true,
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  warn: vi.fn(),
  fallbackOllama: vi.fn(),
  contextBuild: vi.fn(),
}));

vi.mock('../ai/ai.service.js', () => ({
  aiService: {
    chat: mocks.aiChat,
    fallbackOllama: mocks.fallbackOllama,
  },
}));

vi.mock('./tina-context.service.js', () => ({
  tinaContextService: {
    build: mocks.contextBuild,
  },
}));

vi.mock('../../lib/redis.js', () => ({
  get hasPrimaryRedis() {
    return mocks.primaryEnabled;
  },
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
  mocks.aiChat.mockReset();
  mocks.primaryEnabled = true;
  mocks.redisGet.mockReset();
  mocks.redisGet.mockResolvedValue(null);
  mocks.redisSet.mockReset();
  mocks.redisSet.mockResolvedValue('OK');
  mocks.warn.mockReset();
  mocks.fallbackOllama.mockReset();
  mocks.contextBuild.mockReset();
  mocks.contextBuild.mockResolvedValue('Contexto autorizado');
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

    expect(mocks.redisSet.mock.calls).toEqual(
      TINA_KNOWLEDGE.map((item, index) => [`tina:kb:${String(index)}`, item])
    );
  });

  it('consulta apenas as chaves determinísticas conhecidas', async () => {
    mocks.redisGet.mockImplementation((key: string) =>
      Promise.resolve(key === 'tina:kb:1' ? TINA_KNOWLEDGE[1] : null)
    );

    await expect(tinaService.buscarChunks('simulações práticas')).resolves.toContain('Simulações:');
    expect(mocks.redisGet.mock.calls).toEqual(
      TINA_KNOWLEDGE.map((_, index) => [`tina:kb:${String(index)}`])
    );
  });

  it('aceita a representação JSON legada e ignora entradas inválidas isoladamente', async () => {
    mocks.redisGet.mockImplementation((key: string) => {
      if (key === 'tina:kb:0') return Promise.resolve('{invalid-json');
      if (key === 'tina:kb:2')
        return Promise.resolve(
          JSON.stringify({
            categoria: 'incompleta',
            titulo: 'Sem conteúdo',
          })
        );
      if (key === 'tina:kb:1') return Promise.resolve(JSON.stringify(TINA_KNOWLEDGE[1]));
      return Promise.resolve(null);
    });

    await expect(tinaService.buscarChunks('simulações práticas')).resolves.toContain('Simulações:');
    expect(mocks.warn).toHaveBeenCalledWith(
      { key: 'tina:kb:0' },
      'Entrada inválida no cache de conhecimento da Tina'
    );
    expect(mocks.warn).toHaveBeenCalledWith(
      { key: 'tina:kb:2' },
      'Entrada inválida no cache de conhecimento da Tina'
    );
  });

  it('preserva resultados válidos quando uma leitura do cache falha', async () => {
    const error = new Error('Redis indisponível');
    mocks.redisGet.mockImplementation((key: string) => {
      if (key === 'tina:kb:0') return Promise.reject(error);
      if (key === 'tina:kb:1') return Promise.resolve(TINA_KNOWLEDGE[1]);
      return Promise.resolve(null);
    });

    await expect(tinaService.buscarChunks('simulações práticas')).resolves.toContain('Simulações:');
    expect(mocks.warn).toHaveBeenCalledWith(
      { failedReads: 1, totalReads: TINA_KNOWLEDGE.length },
      'Falha parcial ao consultar conhecimento da Tina'
    );
  });

  it('não consulta nem indexa quando o Redis primário está desativado', async () => {
    mocks.primaryEnabled = false;

    await expect(tinaService.buscarChunks('simulações')).resolves.toBe('');
    await expect(tinaService.indexarKnowledge()).resolves.toBeUndefined();

    expect(mocks.redisGet).not.toHaveBeenCalled();
    expect(mocks.redisSet).not.toHaveBeenCalled();
  });

  it('continua a indexação quando uma escrita falha', async () => {
    mocks.redisSet.mockRejectedValueOnce(new Error('Redis indisponível'));

    await expect(tinaService.indexarKnowledge()).resolves.toBeUndefined();

    expect(mocks.redisSet).toHaveBeenCalledTimes(TINA_KNOWLEDGE.length);
    expect(mocks.warn).toHaveBeenCalledWith(
      { failedWrites: 1, totalWrites: TINA_KNOWLEDGE.length },
      'Falha parcial ao indexar conhecimento da Tina'
    );
  });
});

describe('respostas externas da Tina', () => {
  beforeEach(() => {
    mocks.aiChat.mockReset();
  });

  it.each([
    [
      'JSON malformado',
      () => new Response('{invalid-json', { status: 200 }),
      'Falha ao interpretar resposta JSON do provider de IA',
    ],
    [
      'envelope nulo',
      () => Response.json(null),
      'Payload do provider de IA não corresponde ao contrato',
    ],
    [
      'envelope inesperado',
      () => Response.json({ output: 'texto sem contrato' }),
      'Payload do provider de IA não corresponde ao contrato',
    ],
    [
      'resposta não-2xx',
      () => new Response('upstream unavailable', { status: 503 }),
      'Provider de IA devolveu resposta não-2xx',
    ],
  ])(
    'preserva fallbacks quando a IA devolve %s',
    async (_caseName, createResponse, expectedLogMessage) => {
      mocks.aiChat.mockResolvedValue(createResponse());

      await expect(tinaService.gerarPerguntasDesafio('Tecnologia')).resolves.toEqual([]);
      expect(mocks.warn).toHaveBeenLastCalledWith(expect.any(Object), expectedLogMessage);
      mocks.warn.mockClear();

      mocks.aiChat.mockResolvedValue(createResponse());
      await expect(
        tinaService.gerarVereditoDesafio({
          area: 'Tecnologia',
          contexto: 'Teste',
          respostas: ['A'],
        })
      ).resolves.toBeNull();
      expect(mocks.warn).toHaveBeenLastCalledWith(expect.any(Object), expectedLogMessage);
      mocks.warn.mockClear();

      mocks.aiChat.mockResolvedValue(createResponse());
      await expect(
        tinaService.gerarVereditoPsicometrico({
          phi: 7,
          resilience: 8,
          focus: 9,
          domainId: 'TECNOLOGIA',
        })
      ).resolves.toBe('');
      expect(mocks.warn).toHaveBeenLastCalledWith(expect.any(Object), expectedLogMessage);
    }
  );
});

describe('contenção do contexto pessoal da Tina', () => {
  it('não chama DeepSeek nem Ollama quando a validação do contexto nega acesso', async () => {
    mocks.contextBuild.mockRejectedValue(new Error('content access denied'));

    await expect(tinaService.chat(
      [{ role: 'user', content: 'Orientação' }],
      'student-1',
      '127.0.0.1',
      false,
      'estudante',
    )).rejects.toThrow('content access denied');

    expect(mocks.aiChat).not.toHaveBeenCalled();
    expect(mocks.fallbackOllama).not.toHaveBeenCalled();
  });
});
