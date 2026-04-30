import { motion } from 'motion/react';
import { useFadeUp } from './useFadeUp';
import { useTranslation } from '@/hooks/useTranslation';

const STEP_NUMS = ['1', '2', '3'] as const;
const STEP_KEYS = ['step1', 'step2', 'step3'] as const;

export function LandingComoFunciona() {
  const fadeUp = useFadeUp();
  const { t } = useTranslation('landing');

  return (
    <section id="como-funciona" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div {...fadeUp} className="mb-16 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber">
            {t('como_funciona.kicker')}
          </span>
          <h2 className="mt-4 text-3xl font-bold text-text-primary sm:text-4xl">
            {t('como_funciona.title')}
          </h2>
          <div className="mx-auto mt-8 h-px w-2/3 bg-linear-to-r from-transparent via-amber/30 to-transparent" />
        </motion.div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {STEP_KEYS.map((key, i) => (
            <motion.div
              key={key}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' }}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl border border-amber/20 bg-amber/10 text-2xl font-bold text-amber">
                {STEP_NUMS[i]}
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-text-primary">
                {t(`como_funciona.steps.${key}_title`)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {t(`como_funciona.steps.${key}_body`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
