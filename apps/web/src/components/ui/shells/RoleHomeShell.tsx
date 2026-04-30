import { type ReactNode } from 'react';
import { motion } from 'motion/react';
import { QuietHero } from '../quiet/QuietHero.js';
import { QuietSection } from '../quiet/QuietSection.js';

export interface TodayMission {
  label: string;
  description: string;
  to: string;
  type: 'learning' | 'review' | 'collaboration' | 'setup';
}

export interface RoleHomeCarousel {
  id: string;
  title: string;
  carousel: ReactNode;
}

export interface RoleHomeShellProps {
  kicker?: string;
  greeting: string;
  mission: TodayMission | null;
  carousels: RoleHomeCarousel[];
  'data-testid'?: string;
}

const SPRING = { type: 'spring', stiffness: 220, damping: 28 } as const;

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { ...SPRING, delay },
});

export default function RoleHomeShell({
  kicker,
  greeting,
  mission,
  carousels,
  'data-testid': testId,
}: RoleHomeShellProps): React.JSX.Element {
  return (
    <div
      data-testid={testId ?? 'role-home-shell'}
      className="p-5 md:p-8 space-y-10 max-w-7xl mx-auto"
    >
      {/* Hero */}
      <motion.div {...fadeUp(0)}>
        <QuietHero
          kicker={kicker}
          title={greeting}
          data-testid="home-hero-title"
        />
      </motion.div>

      {/* Today Mission */}
      {mission && (
        <motion.div {...fadeUp(0.05)}>
          <div className="rounded-lg border border-accent/20 bg-accent/5 px-5 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-1">
                Hoje
              </p>
              <p className="text-sm font-medium text-ink-primary truncate">{mission.label}</p>
              {mission.description && (
                <p className="text-xs text-ink-secondary mt-0.5">{mission.description}</p>
              )}
            </div>
            <a
              href={mission.to}
              className="shrink-0 text-xs font-semibold text-accent hover:underline min-h-[44px] flex items-center"
            >
              Iniciar →
            </a>
          </div>
        </motion.div>
      )}

      {/* Carousels */}
      {carousels.map((c, i) => (
        <motion.div key={c.id} {...fadeUp(0.08 + i * 0.04)}>
          <QuietSection title={c.title}>
            {c.carousel}
          </QuietSection>
        </motion.div>
      ))}
    </div>
  );
}
