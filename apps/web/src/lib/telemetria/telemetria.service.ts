import { http } from '../api/http.js';
import type { TelemetriaTipo, TelemetriaEvento, TelemetriaSummary } from '@pdc/shared';

// Re-export shared types so existing consumers keep working
export type { TelemetriaTipo, TelemetriaEvento } from '@pdc/shared';

const STORAGE_KEY = 'pdc:telemetry:pending';
const EDGE_URL = (import.meta.env.VITE_EDGE_URL as string | undefined) ?? 'http://localhost:8787';

const getSessionId = () => {
  let id = sessionStorage.getItem('pdc:telemetry:sessionId');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('pdc:telemetry:sessionId', id);
  }
  return id;
};

export interface BatchResult {
  ok: boolean;
  results: Array<{ eventId: string; ok: boolean; duplicado?: boolean }>;
}

export const telemetriaService = {
  registarEvento: async (tipo: TelemetriaTipo, payload: Record<string, unknown>, token?: string) => {
    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    const eventParams = {
      eventId,
      tipo,
      payload,
      timestamp,
      sessionId: getSessionId(),
      url: typeof window !== 'undefined' ? window.location.pathname : undefined,
      visibilityState: typeof document !== 'undefined' ? document.visibilityState : undefined,
    };

    return telemetriaService.registarBatch([eventParams as TelemetriaEvento], token).then(() => ({ ok: true }));
  },

  registarBatch: async (events: TelemetriaEvento[], token?: string): Promise<BatchResult | undefined> => {
    if (events.length === 0) return;

    // 1. Tentar Rota Soberana do Edge (Cloudflare)
    if (token) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(`${EDGE_URL}/telemetria/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Telemetry-Token': token,
          },
          body: JSON.stringify({ events }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return { ok: true, results: events.map(e => ({ eventId: e.eventId, ok: true })) };
        }
      } catch (err) {
        // Fallback natural caso o Edge esteja indisponível (timeout, rede, erro 500)
        console.warn('Edge Worker falhou, fallback ativo para BFF', err);
      }
    }

    // 2. Fallback Seguro para BFF (Railway)
    return http.post<BatchResult>(
      '/telemetria/batch',
      { events },
    );
  },

  syncPending: async (token?: string) => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    let pending: TelemetriaEvento[] = [];
    try {
      pending = JSON.parse(raw) as TelemetriaEvento[];
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (pending.length === 0) return;

    const CHUNK_SIZE = 50;
    const remaining = [...pending];
    
    while (remaining.length > 0) {
      const chunk = remaining.slice(0, CHUNK_SIZE);
      try {
        const result = await telemetriaService.registarBatch(chunk, token);
        
        // Se houve falha parcial (207), removemos apenas os que tiveram ok: true ou duplicado: true
        if (result && !result.ok) {
          const falhados = chunk.filter((_, i) => {
            const r = result.results[i];
            return !r || !r.ok;
          });
          remaining.splice(0, CHUNK_SIZE, ...falhados);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
          break;
        } else {
          remaining.splice(0, CHUNK_SIZE);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
        }
      } catch (error) {
        console.error('Falha ao sincronizar telemetria pendente, mantendo no storage:', error);
        break;
      }
    }
  },

  getSummary: async (userId: string): Promise<TelemetriaSummary> => {
    return http.get<TelemetriaSummary>(`/telemetria/summary?userId=${encodeURIComponent(userId)}`);
  },
};
