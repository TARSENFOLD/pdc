import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useSocket } from '@/lib/realtime/useSocket';
import { Brain, Zap, Activity, Heart } from 'lucide-react';
import {
  type PulseEntry,
  upsertPulse,
  randomPulseFromPool,
  buildInitialEntries,
} from './livePulseData';

const ROTATION_MS = 6_000;

export function LandingLivePulse(): React.JSX.Element {
  const reduced = useReducedMotion();
  const { on } = useSocket();
  const [entries, setEntries] = useState<PulseEntry[]>(buildInitialEntries);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const push = useCallback((text: string): void => {
    setEntries((prev) => upsertPulse(prev, text));
  }, []);

  useEffect(() => {
    const offActivity = on<{ text?: string }>('landing:activity', (data) => {
      if (data.text) push(data.text);
    });
    return () => offActivity();
  }, [on, push]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      push(randomPulseFromPool());
    }, ROTATION_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [push]);

  return (
    <section className="bg-recessed px-4 py-24 sm:px-6 relative overflow-hidden border-y border-ink-tertiary/5">
      {/* 
         HERITAGE PATTERN: Mate Masie (What I hear, I keep)
         Símbolo de sabedoria, prudência e decisão. 
         Linhas ultra-finas (0.4px) para um aspeto de marca de água de luxo.
      */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg stroke='%23D2691E' stroke-width='0.4' fill='none'%3E%3Crect x='10' y='10' width='40' height='40'/%3E%3Crect x='70' y='10' width='40' height='40'/%3E%3Crect x='10' y='70' width='40' height='40'/%3E%3Crect x='70' y='70' width='40' height='40'/%3E%3Ccircle cx='60' cy='60' r='8'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '240px 240px'
        }} />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-16 lg:grid-cols-2 items-center relative z-10">

        {/* Feed de Atividade Realtime */}
        <div className="space-y-10 order-2 lg:order-1">
          <header>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-[0.3em] mb-4 shadow-inner">
              Realtime Pulse
            </div>
            <h2 className="text-4xl font-black tracking-tight text-ink-primary sm:text-5xl font-display leading-[1.1]">
              O batimento da <span className="text-accent italic">comunidade.</span>
            </h2>
            <p className="mt-4 text-lg text-ink-secondary font-medium leading-relaxed max-w-md">
              Talentos angolanos a validar competências em tempo real. Cada batimento é uma decisão.
            </p>
          </header>

          <div className="flex flex-col gap-4">
            {reduced ? (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-5 rounded-2xl bg-surface-elevated border border-ink-tertiary/10 p-5 shadow-sm hover:border-accent/40 transition-all group"
                >
                  <div className="relative h-12 w-12 rounded-xl bg-canvas flex items-center justify-center text-accent border border-ink-tertiary/10 shadow-inner">
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
                    </span>
                    <Activity size={22} strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-bold text-ink-secondary group-hover:text-ink-primary transition-colors leading-snug">
                    {entry.text}
                  </span>
                </div>
              ))
            ) : (
              <AnimatePresence mode="popLayout" initial={false}>
                {entries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, x: -20, scale: 0.98 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      scale: 1,
                      transition: {
                        scale: {
                          repeat: Infinity,
                          duration: 3.5,
                          values: [1, 1.012, 1, 1],
                          times: [0, 0.1, 0.2, 1],
                          ease: "easeInOut"
                        }
                      }
                    }}
                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                    className="flex items-center gap-5 rounded-2xl bg-surface-elevated border border-ink-tertiary/10 p-5 shadow-sm hover:border-accent/40 transition-all group"
                  >
                    <div className="relative h-12 w-12 rounded-xl bg-canvas flex items-center justify-center text-accent border border-ink-tertiary/10 shadow-inner">
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
                      </span>
                      <Activity size={22} strokeWidth={1.5} />
                    </div>
                    <span className="text-sm font-bold text-ink-secondary group-hover:text-ink-primary transition-colors leading-snug">
                      {entry.text}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Visual Callout - Foto Restaurada Limpa */}
        <div className="relative group lg:pl-10 order-1 lg:order-2">
          <div className="absolute -inset-8 rounded-[3rem] bg-accent/5 blur-[120px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          <div className="relative overflow-hidden rounded-[2.5rem] border border-accent/10 aspect-square shadow-2xl asymmetric-a">
            <img
              src="/community.jpg"
              alt="Comunidade PDC"
              className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            {/* Overlay de calor Terracota */}
            <div className="absolute inset-0 bg-gradient-to-tr from-accent/30 via-transparent to-transparent mix-blend-overlay" />
          </div>

          {/* Badge de Autoridade Flutuante (Heartbeat Real) */}
          {reduced ? (
            <div className="absolute -bottom-8 -right-4 glass-panel px-10 py-6 rounded-[2.5rem] shadow-2xl flex items-center gap-5 border-accent/40">
              <div className="h-14 w-14 rounded-2xl bg-accent flex items-center justify-center text-ink-on-accent shadow-lg shadow-accent/40">
                <Heart size={28} fill="currentColor" />
              </div>
              <div>
                <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] leading-none">Sistema Ativo</p>
                <p className="text-xl font-black text-ink-primary mt-1 font-display tracking-tight">Aptidão Validada</p>
              </div>
            </div>
          ) : (
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                boxShadow: [
                  "0 20px 40px rgba(210,105,30,0.1)",
                  "0 20px 40px rgba(210,105,30,0.3)",
                  "0 20px 40px rgba(210,105,30,0.1)"
                ]
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-8 -right-4 glass-panel px-10 py-6 rounded-[2.5rem] shadow-2xl flex items-center gap-5 border-accent/40"
            >
              <div className="h-14 w-14 rounded-2xl bg-accent flex items-center justify-center text-ink-on-accent shadow-lg shadow-accent/40">
                <Heart size={28} fill="currentColor" />
              </div>
              <div>
                <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] leading-none">Sistema Ativo</p>
                <p className="text-xl font-black text-ink-primary mt-1 font-display tracking-tight">Aptidão Validada</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
