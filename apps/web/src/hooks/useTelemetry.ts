import { useCallback, useEffect, useRef } from 'react';
import type { TelemetriaTipo, TelemetriaEvento } from '@pdc/shared';
import { telemetriaService } from '../lib/telemetria/telemetria.service.js';

const BUFFER_LIMIT = 10;
const FLUSH_INTERVAL = 30000; // 30 seconds

export function useTelemetry() {
  const buffer = useRef<TelemetriaEvento[]>([]);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const flush = useCallback(async () => {
    if (buffer.current.length === 0) return;

    const eventsToFlush = [...buffer.current];
    buffer.current = [];

    try {
      await telemetriaService.registarBatch(eventsToFlush);
    } catch (error) {
      console.error('Falha ao enviar telemetria em batch:', error);
      // Optional: Put back in buffer with retry limit
      buffer.current = [...eventsToFlush, ...buffer.current].slice(0, 50);
    }
  }, []);

  const track = useCallback((tipo: TelemetriaTipo, payload: Record<string, unknown> = {}) => {
    const event: TelemetriaEvento = {
      eventId: crypto.randomUUID(),
      tipo,
      payload,
      timestamp: new Date().toISOString(),
    };

    buffer.current.push(event);

    if (buffer.current.length >= BUFFER_LIMIT) {
      flush();
    }
  }, [flush]);

  useEffect(() => {
    timer.current = setInterval(flush, FLUSH_INTERVAL);

    const handleBeforeUnload = () => {
      if (buffer.current.length > 0) {
        // use fetch with keepalive as a fallback for sendBeacon
        const events = JSON.stringify({ events: buffer.current });
        const url = `${import.meta.env.VITE_API_URL || '/api'}/telemetria/batch`;
        
        // We can't use our standard http service here as it's async
        navigator.sendBeacon(url, new Blob([events], { type: 'application/json' }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (timer.current) clearInterval(timer.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flush();
    };
  }, [flush]);

  return { track, flush };
}
