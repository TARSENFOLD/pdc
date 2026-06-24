import { motion } from 'motion/react';
import type { ReputacaoTier } from '@pdc/shared';

export const CircularCerteza = ({ value, tier, label }: { value: number; tier?: ReputacaoTier | null | undefined; label: string }) => {
  const radius = 85;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center group">
      <div className="absolute inset-0 bg-accent/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      <svg className="w-56 h-56 transform -rotate-90 relative z-10">
        <circle
          cx="112" cy="112" r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="12"
        />
        <motion.circle
          cx="112" cy="112" r={radius}
          fill="transparent"
          stroke="url(#accent-gradient)"
          strokeWidth="12"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 2.5, ease: [0.23, 1, 0.32, 1] }}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="accent-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="#FF5C00" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center z-20">
        <span className="font-mono text-5xl font-black tracking-tighter text-ink-primary">
          {String(value)}<span className="text-accent text-2xl">%</span>
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-ink-tertiary mt-1">{label}</span>
      </div>
      {tier && (
        <div className="absolute -bottom-2 bg-accent text-white text-[10px] font-black px-4 py-1 rounded-full shadow-xl uppercase tracking-[0.2em] animate-in zoom-in duration-1000 delay-500 z-30">
           {tier}
        </div>
      )}
    </div>
  );
};

export const Star = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
