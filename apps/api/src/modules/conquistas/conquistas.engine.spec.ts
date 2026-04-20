import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verificarConquistas, REGRAS, EVENT_TO_TRIGGER_MAP } from './conquistas.engine.js';
import { featureFlagService } from '../feature-flags/feature-flags.service.js';
import { DomainEventName } from '../events/types.js';
import { strapiGet, strapiPost } from '../strapi/strapi.client.js';
import type { StrapiListResponse, StrapiSingleResponse } from '../strapi/strapi.types.js';

// ── Module-level mocks (bypass Invalid URL from STRAPI_URL=undefined in tests)
vi.mock('../feature-flags/feature-flags.service.js', () => ({
  featureFlagService: {
    getEffectiveFlags: vi.fn(),
  },
}));

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
}));

// ── Typed mock helpers ─────────────────────────────────────────────────────

function listResponse<T>(data: T[], total = 0): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total } },
  };
}

function postResponse<T>(data: T): StrapiSingleResponse<T> {
  return { data };
}

// ── Shared strapiGet router ────────────────────────────────────────────────
// Simulates Strapi responses per path+params for the given test scenario.

type GetScenario = {
  conquistasTotal?: number; // isAlreadyUnlocked: 0 = not unlocked, >0 = already unlocked
  telemetriaTotal?: number; // countTelemetria threshold
  telemetriaTipo?: string;  // tipo filter to match on
  perfilId?: number;        // resolved perfilId (null = not found)
  failConquistasCheck?: boolean; // isAlreadyUnlocked throws
};

function makeGetMock(s: GetScenario) {
  return vi.fn().mockImplementation(async (path: string, params?: Record<string, string>) => {
    if (path === '/perfis') {
      return listResponse(s.perfilId !== undefined ? [{ id: s.perfilId }] : []);
    }
    if (path === '/conquistas') {
      if (s.failConquistasCheck) throw new Error('Strapi 500');
      return listResponse([], s.conquistasTotal ?? 0);
    }
    if (path === '/telemetrias') {
      const tipo = params?.['filters[tipo][$eq]'];
      if (s.telemetriaTipo && tipo === s.telemetriaTipo) {
        return listResponse([], s.telemetriaTotal ?? 0);
      }
      return listResponse([], 0);
    }
    return listResponse([], 0);
  });
}

// ─────────────────────────────────────────────────────────────────────────────

describe('conquistas.engine Characterization Tests (W0-T7)', () => {
  const userId = 'user-123';
  const perfilId = 456;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValue({
      'AUTO_ACHIEVEMENTS': true,
    });
    // Default POST mocks — success for /conquistas and /conquista-utilizadors
    vi.mocked(strapiPost).mockResolvedValue(postResponse({ id: 999 }));
  });

  // ── Feature Flag ───────────────────────────────────────────────────────────

  describe('Feature Flag: AUTO_ACHIEVEMENTS', () => {
    it('deve retornar [] se a flag AUTO_ACHIEVEMENTS estiver off', async () => {
      vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValue({
        'AUTO_ACHIEVEMENTS': false,
      });

      const result = await verificarConquistas(userId, 'simulacao.concluida');

      expect(result).toEqual([]);
      expect(strapiGet).not.toHaveBeenCalled();
    });

    it('deve retornar [] se featureFlagService falhar', async () => {
      vi.mocked(featureFlagService.getEffectiveFlags).mockRejectedValue(new Error('Serviço indisponível'));

      const result = await verificarConquistas(userId, 'simulacao.concluida');

      expect(result).toEqual([]);
      expect(strapiGet).not.toHaveBeenCalled();
    });
  });

  // ── Auto-trigger & Thresholds ──────────────────────────────────────────────

  describe('Auto-trigger & Thresholds (Regras Dominantes)', () => {
    it('deve desbloquear explorador-vocacional após 3 simulacao.concluida', async () => {
      vi.mocked(strapiGet).mockImplementation(
        makeGetMock({ conquistasTotal: 0, telemetriaTipo: 'simulacao.concluida', telemetriaTotal: 3, perfilId })
      );

      const result = await verificarConquistas(userId, 'simulacao.concluida');

      expect(result).toHaveLength(1);
      expect(result[0]?.slug).toBe('explorador-vocacional');
      // POST /conquistas + POST /conquista-utilizadors
      expect(strapiPost).toHaveBeenCalledTimes(2);
    });

    it('não deve desbloquear explorador-vocacional com apenas 2 simulacao.concluida', async () => {
      vi.mocked(strapiGet).mockImplementation(
        makeGetMock({ conquistasTotal: 0, telemetriaTipo: 'simulacao.concluida', telemetriaTotal: 2, perfilId })
      );

      const result = await verificarConquistas(userId, 'simulacao.concluida');

      expect(result).toHaveLength(0);
      expect(strapiPost).not.toHaveBeenCalled();
    });

    it('deve desbloquear conclusao-de-curso após 1 curso.concluido', async () => {
      vi.mocked(strapiGet).mockImplementation(
        makeGetMock({ conquistasTotal: 0, telemetriaTipo: 'curso.concluido', telemetriaTotal: 1, perfilId })
      );

      const result = await verificarConquistas(userId, 'curso.concluido');
      expect(result).toHaveLength(1);
      expect(result[0]?.slug).toBe('conclusao-de-curso');
    });

    it('deve desbloquear rede-em-crescimento após 5 vinculo.connected', async () => {
      vi.mocked(strapiGet).mockImplementation(
        makeGetMock({ conquistasTotal: 0, telemetriaTipo: 'vinculo.connected', telemetriaTotal: 5, perfilId })
      );

      const result = await verificarConquistas(userId, 'vinculo.connected');
      expect(result).toHaveLength(1);
      expect(result[0]?.slug).toBe('rede-em-crescimento');
    });
  });

  // ── Idempotência e Tratamento de Erros ────────────────────────────────────

  describe('Idempotência e Tratamento de Erros', () => {
    it('deve garantir idempotência e não criar duplicado se isAlreadyUnlocked retornar true', async () => {
      vi.mocked(strapiGet).mockImplementation(
        makeGetMock({ conquistasTotal: 1, telemetriaTipo: 'simulacao.concluida', telemetriaTotal: 3, perfilId })
      );

      const result = await verificarConquistas(userId, 'simulacao.concluida');

      expect(result).toHaveLength(0);
      expect(strapiPost).not.toHaveBeenCalled();
    });

    it('deve continuar e não bloquear se isAlreadyUnlocked falhar silenciosamente', async () => {
      vi.mocked(strapiGet).mockImplementation(
        makeGetMock({ failConquistasCheck: true, telemetriaTipo: 'simulacao.concluida', telemetriaTotal: 3, perfilId })
      );

      const result = await verificarConquistas(userId, 'simulacao.concluida');

      // isAlreadyUnlocked engole o erro retornando false → conquista desbloqueada
      expect(result).toHaveLength(1);
    });

    it('deve falhar a condição threshold e não desbloquear se o perfilId não for encontrado', async () => {
      vi.mocked(strapiGet).mockImplementation(
        // perfilId: undefined → /perfis returns empty → countTelemetria returns 0
        makeGetMock({ conquistasTotal: 0, telemetriaTipo: 'simulacao.concluida', telemetriaTotal: 0 })
      );

      const result = await verificarConquistas(userId, 'simulacao.concluida');
      expect(result).toHaveLength(0);
    });

    it('deve validar os payloads enviados para a criação das conquistas', async () => {
      vi.mocked(strapiGet).mockImplementation(
        makeGetMock({ conquistasTotal: 0, telemetriaTipo: 'simulacao.concluida', telemetriaTotal: 3, perfilId })
      );
      vi.mocked(strapiPost)
        .mockResolvedValueOnce(postResponse({ id: 999 }))   // POST /conquistas
        .mockResolvedValueOnce(postResponse({ id: 888 }));  // POST /conquista-utilizadors

      await verificarConquistas(userId, 'simulacao.concluida');

      expect(strapiPost).toHaveBeenCalledTimes(2);

      const conquistaCall = vi.mocked(strapiPost).mock.calls[0];
      expect(conquistaCall?.[0]).toBe('/conquistas');
      const conquistaBody = conquistaCall?.[1] as Record<string, unknown>;
      expect(conquistaBody.userId).toBe(userId);
      expect(conquistaBody.slug).toBe('explorador-vocacional');
      expect(conquistaBody.desbloqueada).toBe(true);
      expect(conquistaBody.tipo).toBe('automatica');
      expect(conquistaBody.evento).toBe('simulacao.concluida');

      const junctionCall = vi.mocked(strapiPost).mock.calls[1];
      expect(junctionCall?.[0]).toBe('/conquista-utilizadors');
      const junctionBody = junctionCall?.[1] as Record<string, unknown>;
      expect(junctionBody.perfil).toBe(perfilId);
      expect(junctionBody.conquista).toBe(999);
      expect(junctionBody.desbloqueadaEm).toBeDefined();
    });

    it('deve logar aviso silencioso se falhar a criação de conquista-utilizador mas reter a conquista original', async () => {
      vi.mocked(strapiGet).mockImplementation(
        makeGetMock({ conquistasTotal: 0, telemetriaTipo: 'simulacao.concluida', telemetriaTotal: 3, perfilId })
      );
      vi.mocked(strapiPost)
        .mockResolvedValueOnce(postResponse({ id: 999 }))         // POST /conquistas OK
        .mockRejectedValueOnce(new Error('Strapi conquista-utilizadors Error')); // POST /conquista-utilizadors fails

      const result = await verificarConquistas(userId, 'simulacao.concluida');

      // Conquista desbloqueada mesmo com falha na junction table
      expect(result).toHaveLength(1);
    });
  });

  // ── Conquistas Exportadas ─────────────────────────────────────────────────

  describe('Conquistas Exportadas', () => {
    it('REGRAS deve exportar as regras base declarativas (≥12)', () => {
      expect(REGRAS.length).toBeGreaterThanOrEqual(12);
      const simulacaoRule = REGRAS.find(r => r.slug === 'explorador-vocacional');
      expect(simulacaoRule).toBeDefined();
      expect(simulacaoRule?.trigger).toBe('simulacao.concluida');
    });
  });

  // ── T-FIX-3 Regression: naming mismatch ───────────────────────────────────

  describe('T-FIX-3: Strategy A — EVENT_TO_TRIGGER_MAP (naming mismatch)', () => {
    it('EVENT_TO_TRIGGER_MAP deve mapear TENTATIVA_CONCLUIDA para simulacao.concluida', () => {
      expect(EVENT_TO_TRIGGER_MAP[DomainEventName.TENTATIVA_CONCLUIDA]).toBe('simulacao.concluida');
    });

    it('EVENT_TO_TRIGGER_MAP deve mapear todos os 12 eventos canónicos', () => {
      const canonical = [
        DomainEventName.TENTATIVA_CONCLUIDA,
        DomainEventName.CURSO_CONCLUIDO,
        DomainEventName.VINCULO_CONNECTED,
        DomainEventName.LOGIN,
        DomainEventName.MENTORIA_ACEITE,
        DomainEventName.EXPERIENCIA_PUBLICADA,
        DomainEventName.RATING_CRIADO,
        DomainEventName.PERFIL_ATUALIZADO,
        DomainEventName.SIMULACAO_CRIADA,
        DomainEventName.CURSO_PUBLICADO,
        DomainEventName.CURSO_INSCRICAO,
        DomainEventName.COMENTARIO_CRIADO,
      ];
      for (const name of canonical) {
        expect(EVENT_TO_TRIGGER_MAP).toHaveProperty(name);
      }
    });

    it('deve desbloquear explorador-vocacional quando chamado com DomainEventName.TENTATIVA_CONCLUIDA', async () => {
      // TENTATIVA_CONCLUIDA maps to 'simulacao.concluida' via EVENT_TO_TRIGGER_MAP
      vi.mocked(strapiGet).mockImplementation(
        makeGetMock({ conquistasTotal: 0, telemetriaTipo: 'simulacao.concluida', telemetriaTotal: 3, perfilId })
      );

      const result = await verificarConquistas('user-tfix3', DomainEventName.TENTATIVA_CONCLUIDA);
      expect(result).toHaveLength(1);
      expect(result[0]?.slug).toBe('explorador-vocacional');
    });
  });
});
