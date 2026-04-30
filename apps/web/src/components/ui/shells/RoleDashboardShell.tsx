import { type ReactNode } from 'react';
import { motion } from 'motion/react';

export interface RoleDashboardShellProps {
  hero: ReactNode;
  kpiStrip: ReactNode[];
  primary: ReactNode;
  side?: ReactNode;
  activity?: ReactNode;
}

const SPRING = { type: 'spring', stiffness: 220, damping: 28 } as const;

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { ...SPRING, delay },
});

export function RoleDashboardShell({ hero, kpiStrip, primary, side, activity }: RoleDashboardShellProps) {
  return (
    <div className="p-5 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero */}
      <motion.div {...fadeUp(0)}>
        {hero}
      </motion.div>

      {/* KPI Strip */}
      {kpiStrip.length > 0 && (
        <motion.div
          {...fadeUp(0.05)}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${String(kpiStrip.length)}, minmax(0, 1fr))` }}
        >
          {kpiStrip.map((stat, i) => (
            <div key={i}>{stat}</div>
          ))}
        </motion.div>
      )}

      {/* Primary + Side */}
      <motion.div
        {...fadeUp(0.1)}
        className={`grid gap-5 ${side ? 'grid-cols-1 lg:grid-cols-[1fr_340px]' : 'grid-cols-1'}`}
      >
        <div>{primary}</div>
        {side && <div>{side}</div>}
      </motion.div>

      {/* Activity Rail */}
      {activity && (
        <motion.div {...fadeUp(0.15)}>
          {activity}
        </motion.div>
      )}
    </div>
  );
}
