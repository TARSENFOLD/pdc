import { type ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { motion, type HTMLMotionProps } from 'motion/react';

export interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  halo?: boolean;
}

/**
 * GlassCard — Painéis IA / Tina com Glassmorphism.
 * Reflete a Epic 05: Blur 18px, Saturate 140%, Halo Terracota opcional.
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, halo = false, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          'glass-panel relative rounded-xl p-6 overflow-hidden',
          className
        )}
        {...props}
      >
        {/* Halo de Terracota (Assinatura Tina) */}
        {halo && (
          <div
            className="absolute -top-10 -left-10 w-32 h-32 blur-[40px] opacity-20 pointer-events-none"
            style={{ backgroundColor: 'var(--accent-terracotta-glow)' }}
          />
        )}

        <div className="relative z-10">
          {children}
        </div>
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
