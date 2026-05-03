import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import type React from 'react';

const STATS = [
  { value: 12840, suffix: 'h', label: 'Horas poupadas na decisão' },
  { value: 532,   suffix: '+', label: 'Vagas universitárias optimizadas' },
  { value: 4800,  suffix: '+', label: 'Estudantes com rota definida' },
];

function useCountUp(target: number, active = false): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = Math.floor(target * 0.91);
    setValue(start);
    let current = start;

    const schedule = () => {
      const delay = 4000 + Math.random() * 4000;
      return setTimeout(() => {
        if (current >= target) return;
        const delta = Math.random() < 0.55 ? 1 : Math.random() < 0.25 ? 2 : 0;
        current = Math.min(current + delta, target);
        setValue(current);
        if (current < target) timerRef = schedule();
      }, delay);
    };

    let timerRef = schedule();
    return () => { clearTimeout(timerRef); };
  }, [active, target]);
  return value;
}

function StatItem({
  value, suffix, label, active, delay,
}: typeof STATS[number] & { active: boolean; delay: number }): React.JSX.Element {
  const count = useCountUp(value, active);
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={active ? { opacity: 1, y: 0 } : {}}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 28, delay }}
      className="flex w-full flex-col items-center justify-center gap-1.5 px-4 py-6 text-center"
    >
      <span className="text-3xl font-black tabular-nums tracking-tight text-white sm:text-4xl">
        {count.toLocaleString('pt-PT')}<span className="text-white/70">{suffix}</span>
      </span>
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/60 leading-tight">
        {label}
      </span>
    </motion.div>
  );
}

export default function LandingMarquee(): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-5% 0px' });

  return (
    <div ref={ref} style={{ backgroundColor: '#B65F2A' }}>
      <div className="mx-auto flex w-full max-w-4xl items-stretch divide-x divide-white/15 px-4 sm:px-6">
        {STATS.map((stat, i) => (
          <div key={stat.label} className="flex flex-1 items-stretch">
            <StatItem {...stat} active={inView} delay={0.06 + i * 0.1} />
          </div>
        ))}
      </div>
    </div>
  );
}
