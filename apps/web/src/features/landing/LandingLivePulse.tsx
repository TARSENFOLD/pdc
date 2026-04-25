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
  const [globalCount, setGlobalCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRealActivityRef = useRef<number>(0);

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

    // Escuta o pulso global (contagem de utilizadores ativos)
    const offPulse = on<{ count: number; area?: string }>('landing:pulse', (data) => {
      setGlobalCount(data.count);
    });

    return () => {
      offActivity();
      offPulse();
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
    <section className="bg-surface-alt/50 px-4 py-24 sm:px-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute left-0 top-0 h-full w-full opacity-[0.02] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='%23F59E0B'/%3E%3C/svg%3E")`, backgroundSize: '60px 60px' }} />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-16 lg:grid-cols-2 items-center">
        {/* Feed */}
        <div>
          <header className="mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-500 border border-emerald-500/20 mb-4">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live Pulse: {globalCount > 0 ? `${globalCount} ativos` : 'Sistema Ativo'}
            </div>
            <h2 className="text-4xl font-black tracking-tight text-text-primary sm:text-5xl">
              O futuro está a ser <span className="text-amber">decidido agora.</span>
            </h2>
            <p className="mt-4 text-lg text-text-secondary leading-relaxed">
              Vê o batimento cardíaco da nossa comunidade. Talentos em Angola e no mundo a validar as suas competências em tempo real.
            </p>
          </header>

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
                  className="flex items-center gap-4 rounded-2xl bg-surface border border-border/50 p-4 shadow-sm hover:border-amber/20 transition-colors group"
                >
                  <div className="h-10 w-10 rounded-xl bg-surface-raised border border-border flex items-center justify-center text-lg shadow-inner group-hover:bg-amber/5 transition-colors">
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

        {/* Visual Callout */}
        <div className="relative group">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-amber/20 to-emerald-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          <div className="relative overflow-hidden rounded-3xl border border-border aspect-square sm:aspect-video lg:aspect-square shadow-2xl">
            <img
              src="/images/hero/community.jpg"
              alt="Comunidade PDC"
              className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-8 left-8 right-8">
              <p className="text-white font-bold text-xl leading-snug">
                "O PDC ajudou-me a escolher Engenharia com a certeza de quem já viveu o curso."
              </p>
              <p className="text-amber font-bold text-sm mt-2 uppercase tracking-widest">
                — Ricardo, Estudante de Luanda
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
