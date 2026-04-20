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
import { strapiGet, strapiPut } from '../strapi/strapi.client.js';
import type { StrapiListResponse, StrapiSingleResponse } from '../strapi/strapi.types.js';

// ── Module-level mocks (bypass Invalid URL from STRAPI_URL=undefined in tests)
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

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPut: vi.fn(),
}));

// ── Typed mock helpers ─────────────────────────────────────────────────────

function listResponse<T>(data: T[], total = 0): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total } },
  };
}

function singleResponse<T>(data: T): StrapiSingleResponse<T> {
  return { data };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('reputation.service Characterization Tests (W0-T6)', () => {
  const perfilId = '123';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValue({ 
      'REPUTATION_VISIBLE': true 
    });
  });

  describe('Cálculo por Dimensões (WEIGHTS)', () => {
    it('deve calcular correctamente a dimensão ratingsMedia (peso 25)', async () => {
      vi.mocked(strapiGet).mockImplementation(async (path: string, params?: any) => {
        if (path === '/ratings' && params?.['filters[perfilAlvo][$eq]'] === perfilId) {
          return listResponse([{ nota: 5 }, { nota: 5 }]);
        }
        if (path === `/perfis/${perfilId}`) {
          return listResponse([{ createdAt: new Date().toISOString() }]);
        }
        return listResponse([], 0);
      });

      const score = await calcularReputacao(perfilId);
      expect(score).toBe(25);
    });

    it('deve calcular correctamente a dimensão cursosPublicados (peso 20)', async () => {
      vi.mocked(strapiGet).mockImplementation(async (path: string) => {
        if (path === '/cursos') return listResponse([], 5); // 5/10 -> 0.5 * 20 = 10
        if (path === `/perfis/${perfilId}`) return listResponse([{ createdAt: new Date().toISOString() }]);
        return listResponse([], 0);
      });

      const score = await calcularReputacao(perfilId);
      expect(score).toBe(10);
    });

    it('deve calcular correctamente a dimensão simulacoes (peso 15)', async () => {
      vi.mocked(strapiGet).mockImplementation(async (path: string) => {
        if (path === '/simulacoes') return listResponse([], 20); // 20/20 -> 1.0 * 15 = 15
        if (path === `/perfis/${perfilId}`) return listResponse([{ createdAt: new Date().toISOString() }]);
        return listResponse([], 0);
      });

      const score = await calcularReputacao(perfilId);
      expect(score).toBe(15);
    });

    it('deve calcular correctamente a dimensão conquistas (peso 20)', async () => {
      vi.mocked(strapiGet).mockImplementation(async (path: string) => {
        if (path === '/conquistas') return listResponse([], 15); // 15/15 -> 1.0 * 20 = 20
        if (path === `/perfis/${perfilId}`) return listResponse([{ createdAt: new Date().toISOString() }]);
        return listResponse([], 0);
      });

      const score = await calcularReputacao(perfilId);
      expect(score).toBe(20);
    });

    it('deve calcular correctamente a dimensão tempoPlataforma (peso 10)', async () => {
      vi.mocked(strapiGet).mockImplementation(async (path: string) => {
        if (path === `/perfis/${perfilId}`) {
          const twoYearsAgo = new Date();
          twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
          return listResponse([{ createdAt: twoYearsAgo.toISOString() }]);
        }
        return listResponse([], 0);
      });

      const score = await calcularReputacao(perfilId);
      expect(score).toBe(10);
    });

    it('deve calcular correctamente a dimensão engagement (peso 10)', async () => {
      vi.mocked(strapiGet).mockImplementation(async (path: string, params?: any) => {
        if (path === '/comments') return listResponse([], 25);
        if (path === '/ratings' && params?.['filters[autor][$eq]'] === perfilId) {
          return listResponse([], 25);
        }
        if (path === `/perfis/${perfilId}`) return listResponse([{ createdAt: new Date().toISOString() }]);
        return listResponse([], 0);
      });

      const score = await calcularReputacao(perfilId);
      expect(score).toBe(10);
    });
  });

  describe('Feature Flag: REPUTATION_VISIBLE', () => {
    it('deve retornar score real quando a flag está activa', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(strapiGet).mockResolvedValue(listResponse([{ reputacao: 88 }]));

      const score = await getReputacao(perfilId);
      expect(score).toBe(88);
    });

    it('deve retornar 0 quando a flag está desactivada (comportamento ACTUAL)', async () => {
      vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValue({ 
        'REPUTATION_VISIBLE': false 
      });

      const score = await getReputacao(perfilId);
      expect(score).toBe(0);
      expect(strapiGet).not.toHaveBeenCalled();
    });
  });

  describe('Redis Cache', () => {
    it('deve retornar do cache (HIT) sem chamar o Strapi', async () => {
      vi.mocked(redis.get).mockResolvedValue(75);

      const score = await getReputacao(perfilId);
      
      expect(score).toBe(75);
      expect(strapiGet).not.toHaveBeenCalled();
    });

    it('deve popular o cache (MISS) com TTL de 5 min (300s)', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(strapiGet).mockResolvedValue(listResponse([{ reputacao: 42 }]));

      const score = await getReputacao(perfilId);
      
      expect(score).toBe(42);
      expect(redis.set).toHaveBeenCalledWith(`reputation:${perfilId}`, 42, { ex: 300 });
    });
  });

  describe('Integridade de Persistência e Fluxo Global', () => {
    it('persistirReputacao: deve validar o payload de actualização no Strapi', async () => {
      vi.mocked(strapiGet).mockImplementation(async (path: string) => {
        if (path === `/perfis/${perfilId}`) {
          return listResponse([{ id: 123, documentId: 'doc_xyz', createdAt: new Date().toISOString() }]);
        }
        return listResponse([], 0);
      });

      vi.mocked(strapiPut).mockImplementation(async (path: string, body: any) => {
        expect(path).toBe('/perfis/doc_xyz');
        expect(body.reputacao).toBeDefined();
        return singleResponse({ id: 123, reputacao: body.reputacao });
      });

      const score = await persistirReputacao(perfilId);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('marcarParaRecalculo: deve adicionar o ID ao set do Redis', async () => {
      await marcarParaRecalculo(perfilId, 'Teste');
      expect(redis.sadd).toHaveBeenCalledWith('reputation:recalc_queue', perfilId);
    });

    it('recalcularGlobal: deve ser totalmente auto-contido e processar perfis', async () => {
      let page1Called = false;
      vi.mocked(strapiGet).mockImplementation(async (path: string, _params?: any) => {
        if (path === '/perfis') {
          if (!page1Called) {
            page1Called = true;
            return {
              data: [{ id: 1, documentId: 'd1', nome: 'P1' }, { id: 2, documentId: 'd2', nome: 'P2' }],
              meta: { pagination: { page: 1, pageCount: 1, total: 2 } }
            } as StrapiListResponse<any>;
          }
          return listResponse([], 0);
        }
        if (path.includes('/perfis/')) {
          return listResponse([{ id: 1, documentId: 'd1', createdAt: new Date().toISOString() }]);
        }
        return listResponse([], 0);
      });

      vi.mocked(strapiPut).mockResolvedValue(singleResponse({ id: 1 }));

      const result = await recalcularGlobal();
      expect(result.updated).toBe(2);
      expect(strapiPut).toHaveBeenCalledTimes(2);
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
      vi.mocked(strapiGet).mockImplementation(async (path: string, params?: any) => {
        if (path === '/ratings' && params?.['filters[perfilAlvo][$eq]'] === perfilId) return listResponse([{ nota: 4 }]);
        if (path === '/cursos') return listResponse([], 2);
        if (path === '/simulacoes') return listResponse([], 3);
        if (path === '/conquistas') return listResponse([], 5);
        if (path === '/comments') return listResponse([], 10);
        if (path === '/ratings' && params?.['filters[autor][$eq]'] === perfilId) return listResponse([], 5);
        if (path === `/perfis/${perfilId}`) {
          const yearAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 12);
          return listResponse([{ createdAt: yearAgo.toISOString() }]);
        }
        return listResponse([], 0);
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
