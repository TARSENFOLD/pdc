import { motion } from 'motion/react';
import { Compass, Clock, Shuffle } from 'lucide-react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { useFadeUp } from './useFadeUp';
import { useTranslation } from '@/hooks/useTranslation';

const PROBLEMAS_ICONS: ComponentType<LucideProps>[] = [Compass, Clock, Shuffle];
const PROBLEMAS_KEYS = ['sem_referencia', 'tempo_dinheiro', 'desalinhamento'] as const;

export function LandingProblema() {
  const fadeUp = useFadeUp();
  const { t } = useTranslation('landing');

  return (
    <section id="problema" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <motion.div {...fadeUp} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber">{t('problema.kicker')}</span>
          <h2 className="mt-4 text-3xl font-bold text-text-primary sm:text-4xl">
            {t('problema.title')}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-secondary">
            {t('problema.body')}
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {PROBLEMAS_KEYS.map((key, i) => {
            const Icon = PROBLEMAS_ICONS[i] as ComponentType<LucideProps>;
            return (
              <motion.div
                key={key}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
                className="rounded-2xl border-2 p-6"
                style={{ borderColor: 'rgba(42,39,36,0.75)' }}
              >
                <div className="mb-4 text-amber"><Icon size={20} aria-hidden={true} /></div>
                <h3 className="mb-2 font-semibold text-text-primary">{t(`problema.cards.${key}_title`)}</h3>
                <p className="text-sm leading-relaxed text-text-secondary">{t(`problema.cards.${key}_body`)}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
