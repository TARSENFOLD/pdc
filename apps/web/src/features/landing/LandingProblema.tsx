import { motion } from 'motion/react';
import { Compass, Clock, Shuffle } from 'lucide-react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { useFadeUp } from './useFadeUp';
import { useTranslation } from '@/hooks/useTranslation';

const PROBLEMAS: { key: 'sem_referencia' | 'tempo_dinheiro' | 'desalinhamento'; icon: ComponentType<LucideProps> }[] = [
  { key: 'sem_referencia', icon: Compass },
  { key: 'tempo_dinheiro', icon: Clock },
  { key: 'desalinhamento', icon: Shuffle },
];

export function LandingProblema() {
  const fadeUp = useFadeUp();
  const { t } = useTranslation('landing');

  return (
    <section id="problema" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <motion.div {...fadeUp} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber">{t('problema.kicker')}</span>
          <h2 className="mt-4 text-2xl font-bold text-text-primary sm:text-3xl lg:text-4xl">
            {t('problema.title')}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-secondary">
            {t('problema.body')}
          </p>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMAS.map(({ key, icon: Icon }, i) => (
              <motion.div
                key={key}
                {...fadeUp}
                transition={{ type: 'spring', stiffness: 220, damping: 28, delay: i * 0.1 }}
                className="rounded-2xl border-2 p-6"
                style={{ borderColor: 'var(--card-border)', boxShadow: '0 2px 12px rgba(0,0,0,0.10)' }}
              >
                <div className="mb-4 text-amber"><Icon size={20} aria-hidden={true} /></div>
                <h3 className="mb-2 font-semibold text-text-primary">{t(`problema.cards.${key}_title`)}</h3>
                <p className="text-sm leading-relaxed text-text-secondary">{t(`problema.cards.${key}_body`)}</p>
              </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
