import { Link } from 'react-router-dom';
import { GlassCard } from '../ui/GlassCard';
import { AsymmetricButton } from '../ui/AsymmetricButton';
import { LucideIcon } from 'lucide-react';

interface CTA {
  label: string;
  to: string;
  icon: LucideIcon;
  variant?: 'primary' | 'secondary';
}

interface ContentTypeCTAGridProps {
  title: string;
  ctas: CTA[];
  gridCols?: number;
  className?: string;
}

const gridColsClass: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

export default function ContentTypeCTAGrid({ title, ctas, gridCols = 2, className }: ContentTypeCTAGridProps) {
  const cols = gridColsClass[gridCols] || 'grid-cols-2';
  
  return (
    <div className={`space-y-4 ${className || ''}`}>
      <h3 className="text-[10px] font-black uppercase tracking-widest text-ink-tertiary">{title}</h3>
      <div className={`grid ${cols} gap-4`}>
        {ctas.map((cta) => (
          cta.variant === 'primary' ? (
            <AsymmetricButton key={cta.to} asChild className="h-full min-h-24 w-full">
              <Link to={cta.to} className="flex flex-col items-center justify-center gap-3 text-center">
                <cta.icon size={20} aria-hidden="true" />
                <span className="text-xs font-bold">{cta.label}</span>
              </Link>
            </AsymmetricButton>
          ) : (
            <Link key={cta.to} to={cta.to} className="group">
              <GlassCard
                halo={false}
                className="flex min-h-24 flex-col items-center justify-center gap-3 rounded-sm border border-[var(--chrome-border)] p-4 text-center transition-colors group-hover:border-[var(--accent-terracotta)]"
              >
                <cta.icon size={20} className="text-ink-tertiary transition-colors group-hover:text-accent" aria-hidden="true" />
                <span className="text-xs font-bold">{cta.label}</span>
              </GlassCard>
            </Link>
          )
        ))}
      </div>
    </div>
  );
}
