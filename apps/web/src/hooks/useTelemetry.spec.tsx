/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTelemetry } from './useTelemetry';
import { telemetriaService, type BatchResult } from '../lib/telemetria/telemetria.service';
import { createTelemetryStub } from './__test-utils__/telemetry-stub';

// Mock de Telemetria Service
vi.mock('../lib/telemetria/telemetria.service', () => ({
  telemetriaService: {
    registarBatch: vi.fn().mockResolvedValue({ ok: true }),
    syncPending: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock do Bootstrap Context (Para W1-T4 Token Fetch)
vi.mock('../lib/bootstrap/bootstrap-context.js', () => ({
  useBootstrap: vi.fn().mockReturnValue({
    data: {
      security: {
        telemetryToken: 'teste-token-edge-seguro',
      }
    },
    isLoading: false,
    error: null
  }),
}));

describe('useTelemetry Characterization Tests (W0-T3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
    // Mock do fetch global para a descarga BeforeUnload Edge-First
    global.fetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve realizar flush ao atingir 10 eventos via telemetriaService', async () => {
    const { result } = renderHook(() => useTelemetry());

    await act(async () => {
      for (let i = 0; i < 10; i++) {
        result.current.track('simulacao.iniciada', { step: i });
      }
      await Promise.resolve();
    });

    expect(telemetriaService.registarBatch).toHaveBeenCalledTimes(1);
    const mockCalls = vi.mocked(telemetriaService.registarBatch).mock.calls;
    const events = mockCalls[0]?.[0] ?? [];
    expect(events).toHaveLength(10);
    
    // Validar integridade dos eventos via Stub Logic (garante que o hook produz eventos válidos)
    events.forEach(evt => {
      expect(() => createTelemetryStub(evt)).not.toThrow();
    });
  });

  it('deve disparar fetch com keepalive no beforeunload apontando para Edge com Token Seguro (W1-T4)', () => {
    const { result } = renderHook(() => useTelemetry());

    act(() => {
      result.current.track('simulacao.concluida', { score: 10 });
    });

    window.dispatchEvent(new Event('beforeunload'));

    // Verifica a migração do Edge-First Fetch
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/telemetria/batch'),
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          'X-Telemetry-Token': 'teste-token-edge-seguro',
        },
      })
    );
  });

  it('deve devolver eventos ao buffer se o telemetriaService falhar (Original Retry Logic)', async () => {
    vi.mocked(telemetriaService.registarBatch).mockRejectedValueOnce(new Error('API Offline'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useTelemetry());

    await act(async () => {
      for (let i = 0; i < 10; i++) result.current.track('simulacao.iniciada');
      await Promise.resolve();
    });

    expect(telemetriaService.registarBatch).toHaveBeenCalledTimes(1);
    
    // No próximo intervalo de 30s, deve tentar enviar os mesmos 10 novamente
    const successBatch: BatchResult = { ok: true, results: [] };
    vi.mocked(telemetriaService.registarBatch).mockResolvedValueOnce(successBatch);
    
    await act(async () => {
      vi.advanceTimersByTime(30000);
      await Promise.resolve();
    });

    expect(telemetriaService.registarBatch).toHaveBeenCalledTimes(2);
    const secondCallEvents = vi.mocked(telemetriaService.registarBatch).mock.calls[1]?.[0] ?? [];
    expect(secondCallEvents).toHaveLength(10);
    
    consoleSpy.mockRestore();
  });

  it('deve manter intervalo fixo de 30s e NÃO disparar syncPending (Characterization Gap)', async () => {
    const { result } = renderHook(() => useTelemetry());

    act(() => {
      result.current.track('page.viewed');
    });

    // 1º Intervalo
    await act(async () => {
      vi.advanceTimersByTime(30000);
      await Promise.resolve();
    });
    expect(telemetriaService.registarBatch).toHaveBeenCalledTimes(1);

    // 2º Intervalo - cadência fixa confirmada
    act(() => {
      result.current.track('page.viewed');
    });
    await act(async () => {
      vi.advanceTimersByTime(30000);
      await Promise.resolve();
    });
    expect(telemetriaService.registarBatch).toHaveBeenCalledTimes(2);
    
    // O hook NÃO chama syncPending (apesar de o service o expor)
    expect(telemetriaService.syncPending).not.toHaveBeenCalled();
  });

  it('deve ser tipado estritamente e não emitir eventos de visibilidade automaticamente', () => {
    // Caracterização: o hook original NÃO tinha listeners de visibilitychange que trackeavam eventos.
    // Apenas o useEffect de timer disparava o flush.
    renderHook(() => useTelemetry());

    document.dispatchEvent(new Event('visibilitychange'));
    
    // Se o hook não tem o listener, o buffer de 10 não será atingido nem o track chamado
    expect(telemetriaService.registarBatch).not.toHaveBeenCalled();
  });
});
