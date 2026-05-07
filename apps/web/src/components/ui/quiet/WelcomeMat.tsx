import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const STORAGE_KEY = 'pdc:welcome-mat-dismissed';

export interface WelcomeMatProps {
  title: string;
  description?: string;
  illustration?: ReactNode;
  actions?: ReactNode;
  dismissable?: boolean;
  /** Unique key to namespace the dismissed state per context */
  storageKey?: string;
  className?: string;
  'data-testid'?: string;
}

const SPRING = { type: 'spring', stiffness: 220, damping: 28 } as const;

export default function WelcomeMat({
  title,
  description,
  illustration,
  actions,
  dismissable = false,
  storageKey,
  className,
  'data-testid': testId,
}: WelcomeMatProps): React.ReactElement {
  const { t } = useTranslation('common');
  const key = storageKey ? `${STORAGE_KEY}:${storageKey}` : STORAGE_KEY;
  
  // SSR safe: start as dismissed (hidden) and check on client mount
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!dismissable) {
      setDismissed(false);
      return;
    }
    try {
      const isDismissed = localStorage.getItem(key) === 'true';
      setDismissed(isDismissed);
    } catch {
      setDismissed(false);
    }
  }, [dismissable, key]);

  const handleDismiss = () => {
    setDismissed(true);
    if (dismissable) {
      try {
        localStorage.setItem(key, 'true');
      } catch {
        // ignore storage errors
      }
    }
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={SPRING}
          data-testid={testId}
          className={cn(
            'relative flex flex-col items-center gap-6 rounded-xl border border-accent/10',
            'bg-elevated px-6 py-10 text-center',
            className,
          )}
        >
          {dismissable && (
            <button
              aria-label={t('dismiss', 'Dispensar')}
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-ink-tertiary hover:text-ink-secondary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X size={20} />
            </button>
          )}

          {illustration && (
            <div className="text-accent/60" aria-hidden>
              {illustration}
            </div>
          )}

          <div className="space-y-2 max-w-sm">
            <h3 className="text-xl font-display font-semibold text-ink-primary">{title}</h3>
            {description && (
              <p className="text-sm text-ink-secondary leading-relaxed">{description}</p>
            )}
          </div>

          {actions && (
            <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
