import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle2, CircleSlash, ListChecks } from 'lucide-react';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { domainEventsApi } from '@/lib/api/domain-events';

export interface ImpactMetric {
  label: string;
  value: string | number;
  icon: typeof Activity;
}

interface EcosystemImpactPanelProps {
  eventId: string;
  variant?: 'compact' | 'full';
  onComplete?: () => void;
  impacts?: ImpactMetric[];
  isLoading?: boolean;
}

const SPRING = { type: 'spring', stiffness: 220, damping: 28 } as const;

export function EcosystemImpactPanel({ 
  eventId, 
  variant = 'full', 
  onComplete,
  impacts,
  isLoading = false
}: EcosystemImpactPanelProps): React.ReactElement {
  const impactQuery = useQuery({
    queryKey: ['domain-events', eventId, 'my-impact'],
    queryFn: () => domainEventsApi.getMyImpact(eventId),
    enabled: impacts === undefined && eventId.trim().length > 0,
    refetchInterval: 1000,
    retry: 2,
  });

  const defaultImpacts: ImpactMetric[] = [
    { label: 'Aplicadas', icon: Activity, value: impactQuery.data?.impact.success ?? 0 },
    { label: 'Não aplicáveis', icon: CircleSlash, value: impactQuery.data?.impact.skipped ?? 0 },
    { label: 'Verificações', icon: ListChecks, value: impactQuery.data?.impact.totalHooks ?? 0 },
  ];

  const displayImpacts = impacts || defaultImpacts;
  const loadingImpact = isLoading || (impacts === undefined && impactQuery.isLoading);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING}
      className="bg-elevated/80 backdrop-blur-xl border border-accent/20 rounded-3xl p-8 shadow-2xl text-center space-y-8"
    >
      <div className="h-20 w-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto text-accent">
        <CheckCircle2 size={40} />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-black text-ink-primary">Impacto Registado</h2>
        <p className="text-sm text-ink-secondary max-w-xs mx-auto">
          A tua publicação foi integrada. As áreas relevantes da plataforma já foram atualizadas.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4">
        {displayImpacts.map((item, i) => (
          <div key={i} className="p-4 bg-recessed rounded-2xl border border-white/5 space-y-2">
            <item.icon size={16} className="mx-auto text-accent/60" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">{item.label}</p>
            {loadingImpact ? (
              <Skeleton className="h-6 w-12 mx-auto" />
            ) : (
              <p className="text-lg font-black text-accent">{item.value}</p>
            )}
          </div>
        ))}
      </div>

      {variant === 'full' && (
        <Button 
          disabled={loadingImpact}
          onClick={onComplete}
          className="w-full h-14 rounded-2xl bg-accent text-white font-bold text-sm"
        >
          Continuar para o Ecossistema
        </Button>
      )}
    </motion.div>
  );
}
