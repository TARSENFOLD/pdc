import { useState } from 'react';
import { LoaderCircle, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';
import { motion, useReducedMotion } from 'motion/react';

interface BootstrapErrorScreenProps {
  error?: Error | null;
  onRetry: () => void | Promise<void>;
}

export default function BootstrapErrorScreen({ error, onRetry }: BootstrapErrorScreenProps): React.ReactElement {
  const [isRetrying, setIsRetrying] = useState(false);
  const reducedMotion = useReducedMotion();

  const retry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } catch (retryError) {
      console.error('Bootstrap retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <GlassCard
        halo
        className="w-full max-w-md rounded-sm border border-[var(--glass-border-light)] p-8 text-center"
        initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-sm bg-error/10 text-error">
          <ShieldAlert size={40} />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Falha na inicialização</h1>
        <p className="mt-3 text-ink-secondary">{error?.message || 'Não foi possível ligar aos serviços do PDC.'}</p>
        {isRetrying && (
          <motion.div
            className="mt-5 h-1 origin-left bg-accent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: reducedMotion ? 0.01 : 1.2, repeat: Infinity }}
            aria-label="A tentar restabelecer a ligação"
          />
        )}
        <Button onClick={() => { void retry(); }} disabled={isRetrying} className="mt-6 h-14 w-full rounded-sm bg-accent font-bold text-white">
          {isRetrying ? <><LoaderCircle className="mr-2 animate-spin" size={18} /> A restabelecer</> : 'Tentar novamente'}
        </Button>
      </GlassCard>
    </div>
  );
}
