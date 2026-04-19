import { useCallback, useEffect, useRef } from 'react';
import type { TelemetriaTipo, TelemetriaEvento } from '@pdc/shared';
import { telemetriaService } from '../lib/telemetria/telemetria.service.js';
import { useBootstrap } from '../lib/bootstrap/BootstrapContext.js';

const BUFFER_LIMIT = 10;
const FLUSH_INTERVAL = 30000;
const EDGE_URL = (import.meta.env.VITE_EDGE_URL as string | undefined) ?? 'http://localhost:8787';

export function useTelemetry() {
  const buffer = useRef<TelemetriaEvento[]>([]);
  const timer = useRef<NodeJS.Timeout | null>(null);
  
  // W1-T3/W1-T4: O Token é assinado e trazido de forma segura durante a carga da aplicação
  const { data } = useBootstrap();
  const token = data?.security?.telemetryToken;

  const flush = useCallback(async () => {
    if (buffer.current.length === 0) return;

    const eventsToFlush = [...buffer.current];
    buffer.current = [];

    try {
      // Passamos o token para utilizar o Edge de preferência, ou o Fallback do BFF
      await telemetriaService.registarBatch(eventsToFlush, token);
    } catch (error) {
      console.error('Falha ao enviar telemetria:', error);
      // Fallback original: devolver ao buffer (limitado)
      buffer.current = [...eventsToFlush, ...buffer.current].slice(0, 50);
    }
  }, [token]);

  const track = useCallback((tipo: TelemetriaTipo, payload: Record<string, unknown> = {}) => {
    const event: TelemetriaEvento = {
      eventId: crypto.randomUUID(),
      tipo,
      payload,
      timestamp: new Date().toISOString(),
    };

    buffer.current.push(event);

    if (buffer.current.length >= BUFFER_LIMIT) {
      void flush();
    }
  }, [flush]);

  useEffect(() => {
    timer.current = setInterval(() => { void flush(); }, FLUSH_INTERVAL);

    const handleBeforeUnload = () => {
      if (buffer.current.length > 0) {
        const payload = JSON.stringify({ events: buffer.current });
        
        if (token) {
          // sendBeacon() não aceita custom headers. Usamos a fetch API com keepalive.
          fetch(`${EDGE_URL}/telemetria/batch`, {
            method: 'POST',
            body: payload,
            headers: { 
              'Content-Type': 'application/json',
              'X-Telemetry-Token': token 
            },
            keepalive: true,
          }).catch(() => {
            // Em caso de falha imediata, enviar para BFF
            fetch(`${import.meta.env.VITE_API_URL || '/api'}/telemetria/batch`, {
              method: 'POST',
              body: payload,
              headers: { 'Content-Type': 'application/json' },
              keepalive: true,
            }).catch(() => {});
          });
        } else {
          // Visitantes Anónimos: Fallback apenas via BFF sem Token (a rota permite injecção relaxada)
          fetch(`${import.meta.env.VITE_API_URL || '/api'}/telemetria/batch`, {
            method: 'POST',
            body: payload,
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (timer.current) clearInterval(timer.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      void flush();
    };
  }, [flush, token]);

  return { track, flush };
}
