import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useSocket } from '@/lib/realtime/useSocket';
import {
  type PulseEntry,
  upsertPulse,
  randomPulseFromPool,
  buildInitialEntries,
} from './livePulseData';

// ─── Constants ───────────────────────────────────────────────────────────────

const ROTATION_MS = 8_000;

// ─── Component ───────────────────────────────────────────────────────────────

export function LandingLivePulse(): React.JSX.Element {
  const reduced = useReducedMotion();
  const { on } = useSocket();
  const [entries, setEntries] = useState<PulseEntry[]>(buildInitialEntries);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRealActivityRef = useRef(0);

  const push = useCallback((text: string): void => {
    setEntries((prev) => upsertPulse(prev, text));
  }, []);

  // Real WS activity from other users
  useEffect(() => {
    // Escuta atividade específica (ex: 'Estudante em Luanda concluiu desafio')
    const offActivity = on<{ text?: string; area?: string }>('landing:activity', (data) => {
      if (data.text) {
        lastRealActivityRef.current = Date.now();
        push(data.text);
      }
    });

    return () => {
      offActivity();
    };
  }, [on, push]);

  // Fallback rotation when no WS activity
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const timeSinceLastReal = Date.now() - lastRealActivityRef.current;
      // Only push fallback if no real activity in the last ROTATION_MS
      if (timeSinceLastReal >= ROTATION_MS) {
        push(randomPulseFromPool());
      }
    }, ROTATION_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [push]);

  return (
    <section className="px-4 py-24 sm:px-6">
      {/* Título — largura total, acima do grid */}
      <div className="mx-auto max-w-6xl mb-12 text-center">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl" style={{ color: 'var(--ink-primary, #1A1614)' }}>
          O futuro está a ser <span className="text-amber">decidido agora.</span>
        </h2>
        <p className="mt-4 text-lg leading-relaxed mx-auto max-w-2xl" style={{ color: 'var(--ink-secondary, #3A3632)' }}>
          Vê o batimento cardíaco da nossa comunidade. Talentos em Angola e no mundo a validar as suas competências em tempo real.
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-start">
        {/* Imagem — esquerda no desktop, topo no mobile */}
        <div className="flex justify-center lg:justify-end">
          <img
            src="/live_pulse.png"
            alt="Live Pulse PDC"
            className="w-full lg:w-[100%] h-auto object-contain"
            loading="lazy"
          />
        </div>

        {/* Feed */}
        <div>
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {entries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={reduced ? { opacity: 0 } : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, x: 20 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: i * 0.05 }}
                  className="flex items-center gap-4 rounded-2xl bg-surface border-2 p-4 shadow-sm transition-colors group"
                  style={{ borderColor: 'var(--card-border, #000000)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
                >
                  <div className="h-10 w-10 rounded-xl bg-surface-raised border-2 flex items-center justify-center text-lg shadow-inner group-hover:bg-amber/5 transition-colors" style={{ borderColor: 'var(--card-border, #000000)' }}>
                    ✨
                  </div>
                  <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                    {entry.text}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
