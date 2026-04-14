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

const ROTATION_MS = 5_000;

// ─── Component ───────────────────────────────────────────────────────────────

export function LandingLivePulse(): React.JSX.Element {
  const reduced = useReducedMotion();
  const { on } = useSocket();
  const [entries, setEntries] = useState<PulseEntry[]>(buildInitialEntries);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const push = useCallback((text: string): void => {
    setEntries((prev) => upsertPulse(prev, text));
  }, []);

  // Real WS activity from other users
  useEffect(() => {
    return on<{ text?: string; area?: string }>('landing:activity', (data) => {
      if (data.text) push(data.text);
    });
  }, [on, push]);

  // Fallback rotation when no WS activity
  useEffect(() => {
    timerRef.current = setInterval(() => {
      push(randomPulseFromPool());
    }, ROTATION_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [push]);

  return (
    <section className="bg-surface-alt px-4 py-24 sm:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Feed */}
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            O que acontece agora.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
            Estudantes a agir em tempo real. Cada linha é um progresso
            concreto da plataforma.
          </p>

          <div className="mt-10 flex flex-col gap-2.5">
            <AnimatePresence mode="popLayout" initial={false}>
              {entries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: 'easeOut', delay: i * 0.05 }}
                  className="flex items-center gap-3 rounded-lg bg-surface px-4 py-3"
                >
                  <PulseDot />
                  <span className="text-sm leading-snug text-text-secondary">
                    {entry.text}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Image */}
        <div className="hidden items-center justify-center lg:flex">
          <img
            src="/images/hero/community.jpg"
            alt="Grupo de estudantes angolanos juntos"
            className="w-full rounded-2xl object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PulseDot(): React.JSX.Element {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}
