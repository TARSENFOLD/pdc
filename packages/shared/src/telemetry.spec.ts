import { describe, it, expect } from 'vitest';
import { TelemetriaTipoSchema, TelemetriaEventoSchema } from './telemetry.js';

describe('Telemetria Schemas', () => {
  it('deve validar todos os tipos de telemetria conhecidos', () => {
    const tipos = [
      'simulacao.iniciada',
      'simulacao.concluida',
      'video.assistido',
      'checklist.item_marcado',
      'iframe.sessao',
      'curso.item_concluido',
      'landing_hero_started',
      'landing_hero_area_detected',
      'landing_hero_verdict_generated',
      'landing_hero_verdict_failed',
      'page.viewed',
      'curso.detail_viewed',
      'dashboard.viewed',
      'vinculos.viewed',
      'vinculos.action',
      'login.success'
    ];

    tipos.forEach(tipo => {
      const result = TelemetriaTipoSchema.safeParse(tipo);
      expect(result.success, `Tipo ${tipo} deve ser válido`).toBe(true);
    });
  });

  it('deve rejeitar tipos de telemetria inválidos', () => {
    const result = TelemetriaTipoSchema.safeParse('tipo.inexistente');
    expect(result.success).toBe(false);
  });

  it('deve validar um evento completo corretamente', () => {
    const evento = {
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      tipo: 'page.viewed',
      payload: { path: '/home' },
      timestamp: new Date().toISOString(),
      sessionId: 'session-123',
      url: 'http://localhost/home',
      visibilityState: 'visible'
    };

    const result = TelemetriaEventoSchema.safeParse(evento);
    expect(result.success).toBe(true);
  });

  it('deve rejeitar evento com eventId que não é UUID', () => {
    const evento = {
      eventId: 'invalid-uuid',
      tipo: 'page.viewed',
      timestamp: new Date().toISOString()
    };

    const result = TelemetriaEventoSchema.safeParse(evento);
    expect(result.success).toBe(false);
  });
});
