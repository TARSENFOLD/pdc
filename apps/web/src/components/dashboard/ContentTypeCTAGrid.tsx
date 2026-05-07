import { Link } from 'react-router-dom';
import { Card } from '../ui';
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
          <Link key={cta.to} to={cta.to}>
            <Card interactive className="p-4 flex flex-col items-center text-center gap-3 border-white/5 hover:border-accent/30">
              <cta.icon size={20} className={cta.variant === 'primary' ? 'text-accent' : 'text-ink-tertiary'} />
              <span className="text-xs font-bold">{cta.label}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
