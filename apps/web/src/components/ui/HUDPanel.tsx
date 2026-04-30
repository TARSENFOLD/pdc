import React from 'react';
import { cn } from '@/lib/utils';

interface HUDMetricProps {
  label: string;
  value: string | number;
  symbol?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
}

function HUDMetric({ label, value, symbol, color }: HUDMetricProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-ink-tertiary-dark">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-2xl font-mono font-bold tabular-nums", color || "text-ink-primary-dark")}>
          {value}
        </span>
        {symbol && <span className="text-xs font-mono text-ink-tertiary-dark">{symbol}</span>}
      </div>
    </div>
  );
}

interface HUDPanelProps {
  phi: number;
  resilience: number;
  timer: string;
  hesitation: number;
  className?: string;
  'data-testid'?: string;
}

export function HUDPanel({
  phi,
  resilience,
  timer,
  hesitation,
  className,
  'data-testid': testId
}: HUDPanelProps): React.ReactElement {
  return (
    <div 
      data-testid={testId}
      className={cn(
        "bg-surface-canvas-dark border-l border-white/10 p-6 flex flex-col gap-8 h-full min-w-[240px]",
        className
      )}
    >
      <div className="space-y-6">
        <HUDMetric 
          label="Fluidez_φ" 
          value={phi.toFixed(2)} 
          color={phi > 0.7 ? "text-accent-success" : "text-ink-primary-dark"}
        />
        <HUDMetric 
          label="Resiliência_R" 
          value={resilience.toFixed(2)} 
        />
        
        <div className="h-px bg-white/5" />
        
        <HUDMetric 
          label="Cronómetro" 
          value={timer} 
          color="text-accent-warning"
        />
        
        <HUDMetric 
          label="Hesitação" 
          value={(hesitation * 100).toFixed(0)}
          symbol="%"
        />
      </div>

      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="px-3 py-1.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-ink-tertiary-dark uppercase tracking-widest text-center">
          Sanity · Dual-Layer OK
        </div>
      </div>
    </div>
  );
}
