import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verificarConquistas, REGRAS } from './conquistas.engine.js';
import { featureFlagService } from '../feature-flags/feature-flags.service.js';

// Mocks
vi.mock('../feature-flags/feature-flags.service.js', () => ({
  featureFlagService: {
    getEffectiveFlags: vi.fn(),
  },
}));

// Mock Global do Fetch para Strapi
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('conquistas.engine Characterization Tests (W0-T7)', () => {
  const userId = 'user-123';
  const perfilId = 456;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValue({ 
      'AUTO_ACHIEVEMENTS': true 
    });
  });

  /**
   * Helper para criar respostas do Strapi consistentes
   */
  function mockStrapiResponse(data: unknown, meta: Record<string, unknown> = {}) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ data, meta }),
    } as Response;
  }

  describe('Feature Flag: AUTO_ACHIEVEMENTS', () => {
    it('deve retornar [] se a flag AUTO_ACHIEVEMENTS estiver off', async () => {
      vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValue({ 
        'AUTO_ACHIEVEMENTS': false 
      });

      const result = await verificarConquistas(userId, 'simulacao.concluida');
      
      expect(result).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('deve retornar [] se featureFlagService falhar', async () => {
      vi.mocked(featureFlagService.getEffectiveFlags).mockRejectedValue(new Error('Serviço indisponível'));

      const result = await verificarConquistas(userId, 'simulacao.concluida');
      
      expect(result).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('Auto-trigger & Thresholds (Regras Dominantes)', () => {
    it('deve desbloquear explorador-vocacional após 3 simulacao.concluida', async () => {
      fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
        const u = new URL(url);
        if (options?.method === 'POST') {
          if (u.pathname.endsWith('/conquistas')) return mockStrapiResponse({ id: 999 });
          if (u.pathname.endsWith('/conquista-utilizadors')) return mockStrapiResponse({ id: 888 });
        }
        if (u.pathname.endsWith('/perfis') && u.searchParams.get('filters[userId][$eq]') === userId) {
          return mockStrapiResponse([{ id: perfilId }]);
        }
        if (u.pathname.endsWith('/conquistas')) {
          return mockStrapiResponse([], { pagination: { total: 0 } });
        }
        if (u.pathname.endsWith('/telemetrias') && u.searchParams.get('filters[tipo][$eq]') === 'simulacao.concluida') {
          return mockStrapiResponse([], { pagination: { total: 3 } });
        }
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const result = await verificarConquistas(userId, 'simulacao.concluida');
      
      expect(result).toHaveLength(1);
      expect(result[0]?.slug).toBe('explorador-vocacional');
      
      const posts = fetchMock.mock.calls.filter(c => c[1]?.method === 'POST');
      expect(posts).toHaveLength(2);
    });

    it('não deve desbloquear explorador-vocacional com apenas 2 simulacao.concluida', async () => {
      fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
        const u = new URL(url);
        if (options?.method === 'POST') return mockStrapiResponse({ id: 999 });
        if (u.pathname.endsWith('/perfis')) return mockStrapiResponse([{ id: perfilId }]);
        if (u.pathname.endsWith('/conquistas')) return mockStrapiResponse([], { pagination: { total: 0 } });
        if (u.pathname.endsWith('/telemetrias') && u.searchParams.get('filters[tipo][$eq]') === 'simulacao.concluida') {
          return mockStrapiResponse([], { pagination: { total: 2 } }); // Abaixo do threshold (3)
        }
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const result = await verificarConquistas(userId, 'simulacao.concluida');
      
      expect(result).toHaveLength(0);
      const posts = fetchMock.mock.calls.filter(c => c[1]?.method === 'POST');
      expect(posts).toHaveLength(0);
    });

    it('deve desbloquear conclusao-de-curso após 1 curso.concluido', async () => {
      fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
        const u = new URL(url);
        if (options?.method === 'POST') return mockStrapiResponse({ id: 999 });
        if (u.pathname.endsWith('/perfis')) return mockStrapiResponse([{ id: perfilId }]);
        if (u.pathname.endsWith('/conquistas')) return mockStrapiResponse([], { pagination: { total: 0 } });
        if (u.pathname.endsWith('/telemetrias') && u.searchParams.get('filters[tipo][$eq]') === 'curso.concluido') {
          return mockStrapiResponse([], { pagination: { total: 1 } });
        }
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const result = await verificarConquistas(userId, 'curso.concluido');
      expect(result).toHaveLength(1);
      expect(result[0]?.slug).toBe('conclusao-de-curso');
    });

    it('deve desbloquear rede-em-crescimento após 5 vinculo.connected', async () => {
      fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
        const u = new URL(url);
        if (options?.method === 'POST') return mockStrapiResponse({ id: 999 });
        if (u.pathname.endsWith('/perfis')) return mockStrapiResponse([{ id: perfilId }]);
        if (u.pathname.endsWith('/conquistas')) return mockStrapiResponse([], { pagination: { total: 0 } });
        if (u.pathname.endsWith('/telemetrias') && u.searchParams.get('filters[tipo][$eq]') === 'vinculo.connected') {
          return mockStrapiResponse([], { pagination: { total: 5 } });
        }
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const result = await verificarConquistas(userId, 'vinculo.connected');
      expect(result).toHaveLength(1);
      expect(result[0]?.slug).toBe('rede-em-crescimento');
    });
  });

  describe('Idempotência e Tratamento de Erros', () => {
    it('deve garantir idempotência e não criar duplicado se isAlreadyUnlocked retornar true', async () => {
      fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
        const u = new URL(url);
        if (options?.method === 'POST') return mockStrapiResponse({ id: 999 });
        if (u.pathname.endsWith('/perfis')) return mockStrapiResponse([{ id: perfilId }]);
        if (u.pathname.endsWith('/conquistas')) {
          // Utilizador já tem a conquista (idempotência actua aqui)
          return mockStrapiResponse([], { pagination: { total: 1 } });
        }
        if (u.pathname.endsWith('/telemetrias')) {
          return mockStrapiResponse([], { pagination: { total: 3 } });
        }
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const result = await verificarConquistas(userId, 'simulacao.concluida');
      
      expect(result).toHaveLength(0);
      const posts = fetchMock.mock.calls.filter(c => c[1]?.method === 'POST');
      expect(posts).toHaveLength(0);
    });

    it('deve continuar e não bloquear se isAlreadyUnlocked falhar silenciosamente', async () => {
      fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
        const u = new URL(url);
        if (options?.method === 'POST') return mockStrapiResponse({ id: 999 });
        if (u.pathname.endsWith('/perfis')) return mockStrapiResponse([{ id: perfilId }]);
        if (u.pathname.endsWith('/conquistas')) {
          return { ok: false, status: 500, json: async () => ({}) } as Response;
        }
        if (u.pathname.endsWith('/telemetrias') && u.searchParams.get('filters[tipo][$eq]') === 'simulacao.concluida') {
          return mockStrapiResponse([], { pagination: { total: 3 } });
        }
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const result = await verificarConquistas(userId, 'simulacao.concluida');
      
      // O isAlreadyUnlocked engole o erro e retorna false, permitindo desbloqueio
      expect(result).toHaveLength(1);
    });

    it('deve falhar a condição threshold e não desbloquear se o perfilId não for encontrado', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        const u = new URL(url);
        if (u.pathname.endsWith('/perfis')) return mockStrapiResponse([]); // Perfil não encontrado
        if (u.pathname.endsWith('/conquistas')) return mockStrapiResponse([], { pagination: { total: 0 } });
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const result = await verificarConquistas(userId, 'simulacao.concluida');
      expect(result).toHaveLength(0);
    });

    it('deve validar os payloads enviados para a criação das conquistas', async () => {
      fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
        const u = new URL(url);
        if (options?.method === 'POST') {
          const body = JSON.parse(options.body as string).data;
          if (u.pathname.endsWith('/conquistas')) {
            expect(body.userId).toBe(userId);
            expect(body.slug).toBe('explorador-vocacional');
            expect(body.desbloqueada).toBe(true);
            expect(body.tipo).toBe('automatica');
            expect(body.evento).toBe('simulacao.concluida');
            return mockStrapiResponse({ id: 999 });
          }
          if (u.pathname.endsWith('/conquista-utilizadors')) {
            expect(body.perfil).toBe(perfilId);
            expect(body.conquista).toBe(999);
            expect(body.desbloqueadaEm).toBeDefined();
            return mockStrapiResponse({ id: 888 });
          }
        }
        if (u.pathname.endsWith('/perfis')) return mockStrapiResponse([{ id: perfilId }]);
        if (u.pathname.endsWith('/conquistas')) return mockStrapiResponse([], { pagination: { total: 0 } });
        if (u.pathname.endsWith('/telemetrias') && u.searchParams.get('filters[tipo][$eq]') === 'simulacao.concluida') {
          return mockStrapiResponse([], { pagination: { total: 3 } });
        }
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      await verificarConquistas(userId, 'simulacao.concluida');
      const posts = fetchMock.mock.calls.filter(c => c[1]?.method === 'POST');
      expect(posts).toHaveLength(2);
    });

    it('deve logar aviso silencioso se falhar a criação de conquista-utilizador mas reter a conquista original', async () => {
      fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
        const u = new URL(url);
        if (options?.method === 'POST') {
          if (u.pathname.endsWith('/conquistas')) return mockStrapiResponse({ id: 999 });
          if (u.pathname.endsWith('/conquista-utilizadors')) {
            return { ok: false, status: 500, json: async () => ({ error: 'Strapi Error' }) } as Response;
          }
        }
        if (u.pathname.endsWith('/perfis')) return mockStrapiResponse([{ id: perfilId }]);
        if (u.pathname.endsWith('/conquistas')) return mockStrapiResponse([], { pagination: { total: 0 } });
        if (u.pathname.endsWith('/telemetrias') && u.searchParams.get('filters[tipo][$eq]') === 'simulacao.concluida') {
          return mockStrapiResponse([], { pagination: { total: 3 } });
        }
        return mockStrapiResponse([], { pagination: { total: 0 } });
      });

      const result = await verificarConquistas(userId, 'simulacao.concluida');
      
      // O utilizador ainda recebe o aviso da conquista no front-end, o erro é contido
      expect(result).toHaveLength(1);
    });
  });

  describe('Conquistas Exportadas', () => {
    it('REGRAS deve exportar as regras base declarativas (≥12)', () => {
      expect(REGRAS.length).toBeGreaterThanOrEqual(12);
      const simulacaoRule = REGRAS.find(r => r.slug === 'explorador-vocacional');
      expect(simulacaoRule).toBeDefined();
      expect(simulacaoRule?.trigger).toBe('simulacao.concluida');
    });
  });
});
