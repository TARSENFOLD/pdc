import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  calcularReputacao, 
  persistirReputacao, 
  getReputacao, 
  marcarParaRecalculo, 
  recalcularGlobal, 
  getReputacaoBreakdown 
} from './reputation.service.js';
import { redis } from '../../lib/redis.js';
import * as featureFlagService from '../feature-flags/feature-flags.service.js';

// Mocks de infraestrutura
vi.mock('../../lib/redis.js', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    sadd: vi.fn(),
  },
}));

vi.mock('../feature-flags/feature-flags.service.js', () => ({
  getEffectiveFlags: vi.fn(),
}));

// Mock do Fetch Global (Guardrail: Stub Strapi via fetch)
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('reputation.service Characterization Tests (W0-T6)', () => {
  const perfilId = '123';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValue({ 
      'REPUTATION_VISIBLE': true 
    });
  });

  /**
   * Helper para criar respostas do Strapi validadas (Flat v5 conforme strapi.client.ts)
   */
  function mockStrapiResponse(data: any, meta: any = {}) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ data, meta }),
    } as Response;
  }

  describe('Cálculo por Dimensões (WEIGHTS)', () => {
    it('deve calcular correctamente a dimensão ratingsMedia (peso 25)', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        const u = new URL(url);
        if (u.pathname.endsWith('/ratings') && u.searchParams.get('filters[perfilAlvo][$eq]') === perfilId) {
          const ratings: any[] = [{ nota: 5 }, { nota: 5 }];
          return mockStrapiResponse(ratings);
        }
        if (u.pathname.endsWith(`/perfis/${perfilId}`)) {
          return mockStrapiResponse([{ createdAt: new Date().toISOString() }]);
        }
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const score = await calcularReputacao(perfilId);
      expect(score).toBe(25);
    });

    it('deve calcular correctamente a dimensão cursosPublicados (peso 20)', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        const u = new URL(url);
        if (u.pathname.endsWith('/cursos') && u.searchParams.get('filters[autor][$eq]') === perfilId) {
          return mockStrapiResponse([], { pagination: { total: 5 } }); // 5/10 -> 0.5 * 20 = 10
        }
        if (u.pathname.endsWith(`/perfis/${perfilId}`)) {
          return mockStrapiResponse([{ createdAt: new Date().toISOString() }]);
        }
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const score = await calcularReputacao(perfilId);
      expect(score).toBe(10);
    });

    it('deve calcular correctamente a dimensão simulacoes (peso 15)', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        const u = new URL(url);
        if (u.pathname.endsWith('/simulacoes')) {
          return mockStrapiResponse([], { pagination: { total: 20 } }); // 20/20 -> 1.0 * 15 = 15
        }
        if (u.pathname.endsWith(`/perfis/${perfilId}`)) {
          return mockStrapiResponse([{ createdAt: new Date().toISOString() }]);
        }
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const score = await calcularReputacao(perfilId);
      expect(score).toBe(15);
    });

    it('deve calcular correctamente a dimensão conquistas (peso 20)', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        const u = new URL(url);
        if (u.pathname.endsWith('/conquistas')) {
          return mockStrapiResponse([], { pagination: { total: 15 } }); // 15/15 -> 1.0 * 20 = 20
        }
        if (u.pathname.endsWith(`/perfis/${perfilId}`)) {
          return mockStrapiResponse([{ createdAt: new Date().toISOString() }]);
        }
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const score = await calcularReputacao(perfilId);
      expect(score).toBe(20);
    });

    it('deve calcular correctamente a dimensão tempoPlataforma (peso 10)', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes(`/perfis/${perfilId}`)) {
          const twoYearsAgo = new Date();
          twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
          return mockStrapiResponse([{ createdAt: twoYearsAgo.toISOString() }]); // 24 meses -> 1.0 * 10 = 10
        }
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const score = await calcularReputacao(perfilId);
      expect(score).toBe(10);
    });

    it('deve calcular correctamente a dimensão engagement (peso 10)', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        const u = new URL(url);
        if (u.pathname.endsWith('/comments')) return mockStrapiResponse([], { pagination: { total: 25 } });
        if (u.pathname.endsWith('/ratings') && u.searchParams.get('filters[autor][$eq]') === perfilId) {
          return mockStrapiResponse([], { pagination: { total: 25 } });
        }
        if (u.pathname.endsWith(`/perfis/${perfilId}`)) return mockStrapiResponse([{ createdAt: new Date().toISOString() }]);
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const score = await calcularReputacao(perfilId);
      expect(score).toBe(10);
    });
  });

  describe('Feature Flag: REPUTATION_VISIBLE', () => {
    it('deve retornar score real quando a flag está activa', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      fetchMock.mockResolvedValue(mockStrapiResponse([{ reputacao: 88 }]));

      const score = await getReputacao(perfilId);
      expect(score).toBe(88);
    });

    it('deve retornar 0 quando a flag está desactivada (comportamento ACTUAL)', async () => {
      vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValue({ 
        'REPUTATION_VISIBLE': false 
      });

      const score = await getReputacao(perfilId);
      expect(score).toBe(0);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('Redis Cache', () => {
    it('deve retornar do cache (HIT) sem chamar o Strapi', async () => {
      vi.mocked(redis.get).mockResolvedValue(75);

      const score = await getReputacao(perfilId);
      
      expect(score).toBe(75);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('deve popular o cache (MISS) com TTL de 5 min (300s)', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      fetchMock.mockResolvedValue(mockStrapiResponse([{ reputacao: 42 }]));

      const score = await getReputacao(perfilId);
      
      expect(score).toBe(42);
      expect(redis.set).toHaveBeenCalledWith(`reputation:${perfilId}`, 42, { ex: 300 });
    });
  });

  describe('Integridade de Persistência e Fluxo Global', () => {
    it('persistirReputacao: deve validar o payload de actualização no Strapi', async () => {
      fetchMock.mockImplementation(async (url: string, options: any) => {
        const u = new URL(url);
        // Primeiro busca perfil
        if (u.pathname.endsWith(`/perfis/${perfilId}`)) {
          return mockStrapiResponse([{ id: 123, documentId: 'doc_xyz', createdAt: new Date().toISOString() }]);
        }
        // Depois faz o PUT (Comentário 2: Validação de Payload)
        if (options?.method === 'PUT' && u.pathname.endsWith('/perfis/doc_xyz')) {
          const body = JSON.parse(options.body);
          expect(body.data.reputacao).toBeDefined();
          return mockStrapiResponse({ id: 123, reputacao: body.data.reputacao });
        }
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const score = await persistirReputacao(perfilId);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('marcarParaRecalculo: deve adicionar o ID ao set do Redis', async () => {
      await marcarParaRecalculo(perfilId, 'Teste');
      expect(redis.sadd).toHaveBeenCalledWith('reputation:recalc_queue', perfilId);
    });

    it('recalcularGlobal: deve ser totalmente auto-contido e processar perfis', async () => {
      fetchMock.mockImplementation(async (url: string, options: any) => {
        const u = new URL(url);
        
        // Listagem de perfis
        if (u.pathname.endsWith('/perfis') && !u.pathname.includes(perfilId) && options?.method !== 'PUT') {
          return mockStrapiResponse(
            [{ id: 1, documentId: 'd1', nome: 'P1' }, { id: 2, documentId: 'd2', nome: 'P2' }],
            { pagination: { page: 1, pageCount: 1, total: 2 } }
          );
        }

        // Chamadas internas do persistirReputacao (recalculo)
        if (options?.method === 'PUT') return mockStrapiResponse({ id: 1 });
        if (u.pathname.includes('/perfis/')) return mockStrapiResponse([{ id: 1, documentId: 'd1', createdAt: new Date().toISOString() }]);
        
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const result = await recalcularGlobal();
      expect(result.updated).toBe(2);
      const puts = fetchMock.mock.calls.filter(c => c[1]?.method === 'PUT');
      expect(puts.length).toBe(2);
    });
  });

  describe('Breakdown Detalhado', () => {
    it('deve lançar erro se flag REPUTATION_VISIBLE estiver off (Gate R2.T6)', async () => {
      vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValue({ 
        'REPUTATION_VISIBLE': false 
      });

      await expect(getReputacaoBreakdown(perfilId)).rejects.toThrow();
    });

    it('getReputacaoBreakdown: deve retornar todas as dimensões validadas', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        const u = new URL(url);
        if (u.pathname.endsWith('/ratings') && u.searchParams.get('filters[perfilAlvo][$eq]') === perfilId) return mockStrapiResponse([{ nota: 4 }]);
        if (u.pathname.endsWith('/cursos')) return mockStrapiResponse([], { pagination: { total: 2 } });
        if (u.pathname.endsWith('/simulacoes')) return mockStrapiResponse([], { pagination: { total: 3 } });
        if (u.pathname.endsWith('/conquistas')) return mockStrapiResponse([], { pagination: { total: 5 } });
        if (u.pathname.endsWith('/comments')) return mockStrapiResponse([], { pagination: { total: 10 } });
        if (u.pathname.endsWith('/ratings') && u.searchParams.get('filters[autor][$eq]') === perfilId) return mockStrapiResponse([], { pagination: { total: 5 } });
        if (u.pathname.endsWith(`/perfis/${perfilId}`)) {
          const yearAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 12);
          return mockStrapiResponse([{ createdAt: yearAgo.toISOString() }]);
        }
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const breakdown = await getReputacaoBreakdown(perfilId);
      
      expect(breakdown.dimensions).toEqual({
        ratingsMedia: 4,
        cursosPublicados: 2,
        simulacoes: 3,
        conquistas: 5,
        tempoPlataforma: 12,
        engagement: 15,
      });
    });
  });
});
