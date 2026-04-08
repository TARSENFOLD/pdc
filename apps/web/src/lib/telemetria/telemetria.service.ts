import { http } from '../api/http';
import type { TelemetriaTipo, TelemetriaEvento, TelemetriaSummary } from '@pdc/shared';

// Re-export shared types so existing consumers keep working
export type { TelemetriaTipo, TelemetriaEvento } from '@pdc/shared';

export interface BatchResult {
  ok: boolean;
  results: Array<{ eventId: string; ok: boolean; duplicado?: boolean }>;
}

export const telemetriaService = {
  registarEvento: async (tipo: TelemetriaTipo, payload: Record<string, unknown>) => {
    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    return http.post<{ ok: boolean; duplicado?: boolean }>('/telemetria', {
      eventId,
      tipo,
      payload,
      timestamp,
    });
  },

  registarBatch: async (events: TelemetriaEvento[]): Promise<BatchResult | undefined> => {
    if (events.length === 0) return;
    return http.post<BatchResult>(
      '/telemetria/batch',
      { events },
    );
  },

  getSummary: async (userId: string): Promise<TelemetriaSummary> => {
    return http.get<TelemetriaSummary>(`/telemetria/summary?userId=${encodeURIComponent(userId)}`);
  },
};
