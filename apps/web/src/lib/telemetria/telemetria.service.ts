import { http } from '../api/http';

export type TelemetriaTipo = 
  | 'simulacao.iniciada' 
  | 'simulacao.concluida' 
  | 'video.assistido' 
  | 'checklist.item_marcado' 
  | 'iframe.sessao' 
  | 'curso.item_concluido'
  | 'landing_hero_started'
  | 'landing_hero_area_detected'
  | 'landing_hero_verdict_generated'
  | 'landing_hero_verdict_failed';

export interface TelemetriaEvento {
  eventId: string;
  tipo: TelemetriaTipo;
  payload: Record<string, unknown>;
  timestamp: string;
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
  }
};
