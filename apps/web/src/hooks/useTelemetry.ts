import { useCallback, useEffect, useRef } from 'react';
import type { TelemetriaTipo, TelemetriaEvento } from '@pdc/shared';
import { telemetriaService } from '../lib/telemetria/telemetria.service.js';
import { useBootstrap } from '../lib/bootstrap/BootstrapContext.js';

const BUFFER_LIMIT = 10;
const FLUSH_INTERVAL = 30000;
const BIOMECHANICS_INTERVAL = 250; // ms
const EDGE_URL = (import.meta.env.VITE_EDGE_URL as string | undefined) ?? 'http://localhost:8787';

export function useTelemetry() {
  const buffer = useRef<TelemetriaEvento[]>([]);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastScrollPos = useRef(0);
  const biomechanicsTimer = useRef<NodeJS.Timeout | null>(null);
  const focusStartTime = useRef<number>(Date.now());
  
  // W1-T3/W1-T4: O Token é assinado e trazido de forma segura durante a carga da aplicação
  const { data } = useBootstrap();
  const token = data?.security?.telemetryToken;

  const flush = useCallback(async () => {
    if (buffer.current.length === 0) return;

    const eventsToFlush = [...buffer.current];
    buffer.current = [];

    try {
      // Passamos o token para utilizar o Edge de preferência, ou o Fallback do BFF
      // O Circuit Breaker está implementado dentro do telemetriaService.registarBatch
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
      payload: {
        ...payload,
        visibilityState: document.visibilityState,
      },
      timestamp: new Date().toISOString(),
    };

    buffer.current.push(event);

    if (buffer.current.length >= BUFFER_LIMIT) {
      void flush();
    }
  }, [flush]);

  useEffect(() => {
    // 1. Timer de Flush Regular
    timer.current = setInterval(() => { void flush(); }, FLUSH_INTERVAL);

    // 2. Rastreio Biomecânico (Passivo)
    const handleMouseMove = (e: MouseEvent) => {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    const handleScroll = () => {
      lastScrollPos.current = window.scrollY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    biomechanicsTimer.current = setInterval(() => {
      // Só enviamos biomecânica se estivermos numa simulação ou se houver movimento
      const isSimulation = window.location.pathname.includes('/simulacoes/');
      if (isSimulation) {
        track('simulacao.biomechanics' as TelemetriaTipo, {
          x: lastMousePos.current.x,
          y: lastMousePos.current.y,
          scroll: lastScrollPos.current,
        });
      }
    }, BIOMECHANICS_INTERVAL);

    // 3. Estabilidade de Foco (Micro-interrupções)
    const handleVisibility = () => {
      const now = Date.now();
      if (document.visibilityState === 'hidden') {
        track('focus_lost' as TelemetriaTipo, { 
          duration_since_focus: now - focusStartTime.current 
        });
        void flush();
      } else {
        focusStartTime.current = now;
        track('focus_gained' as TelemetriaTipo, {});
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);

    const handleBeforeUnload = () => {
      if (buffer.current.length > 0) {
        const payload = JSON.stringify({ events: buffer.current });
        
        // No beforeunload, usamos o telemetriaService para respeitar o circuit breaker se possível
        // ou fazemos um fetch directo resiliente
        if (token) {
          fetch(`${EDGE_URL}/telemetria/batch`, {
            method: 'POST',
            body: payload,
            headers: { 
              'Content-Type': 'application/json',
              'X-Telemetry-Token': token 
            },
            keepalive: true,
          }).catch(() => {
            fetch(`${import.meta.env.VITE_API_URL || '/api'}/telemetria/batch`, {
              method: 'POST',
              body: payload,
              headers: { 'Content-Type': 'application/json' },
              keepalive: true,
            }).catch(() => {});
          });
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (timer.current) clearInterval(timer.current);
      if (biomechanicsTimer.current) clearInterval(biomechanicsTimer.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      void flush();
    };
  }, [flush, token, track]);

  return { track, flush };
}
