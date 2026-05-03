import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';

const STATS = [
  { value: 12840, suffix: 'h', label: 'Horas poupadas na decisão' },
  { value: 532,   suffix: '+', label: 'Vagas universitárias optimizadas' },
  { value: 4800,  suffix: '+', label: 'Estudantes com rota definida' },
];

function useCountUp(target: number, duration = 2000, active = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - t, 4)) * target));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return value;
}

function StatItem({
  value, suffix, label, active, delay,
}: typeof STATS[number] & { active: boolean; delay: number }) {
  const count = useCountUp(value, 2000, active);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={active ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-1 px-10 py-5"
    >
      <span className="text-2xl font-black tabular-nums tracking-tight text-white">
        {count.toLocaleString('pt-PT')}<span className="text-white/80">{suffix}</span>
      </span>
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/70">
        {label}
      </span>
    </motion.div>
  );
}

export function LandingMarquee() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-5% 0px' });

  return (
    <div ref={ref} style={{ backgroundColor: '#B65F2A' }}>
      <div className="mx-auto flex max-w-5xl flex-col items-stretch sm:flex-row sm:justify-between">
        {STATS.map((stat, i) => (
          <div key={stat.label} className="flex items-stretch">
            <StatItem {...stat} active={inView} delay={0.06 + i * 0.1} />
            {i < STATS.length - 1 && (
              <div className="hidden sm:block my-4 w-px bg-white/20" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
