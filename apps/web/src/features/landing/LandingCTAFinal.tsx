import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useFadeUp } from './useFadeUp';
import { useTranslation } from '@/hooks/useTranslation';

const MotionLink = motion(Link);
const SPRING = { type: 'spring' as const, stiffness: 220, damping: 28 };

export function LandingCTAFinal() {
  const fadeUp = useFadeUp();
  const { t } = useTranslation('landing');

  return (
    <section className="px-4 py-24 sm:px-6">
      <motion.div
        {...fadeUp}
        className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-amber px-8 py-16 text-center"
      >
        <h2 className="text-3xl font-bold text-white sm:text-4xl">{t('cta_final.title')}</h2>
        <p className="mx-auto mt-4 max-w-lg text-base text-white/80">
          {t('cta_final.body')}
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <MotionLink
            to="/criar-conta"
            className="w-full rounded-tr-2xl rounded-bl-2xl rounded-tl-sm rounded-br-sm bg-white px-8 py-3.5 text-base font-semibold text-amber transition-colors hover:bg-white/90 sm:w-auto"
            whileHover={{ scale: 1.02 }}
            transition={SPRING}
          >
            {t('cta_final.cta_primary')}
          </MotionLink>
          <MotionLink
            to="/login"
            className="w-full rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm backdrop-blur-lg px-8 py-3.5 text-base font-semibold text-white sm:w-auto"
            style={{ border: '1px solid rgba(182,95,42,0.35)', background: 'rgba(182,95,42,0.15)', boxShadow: '0 4px 20px rgba(182,95,42,0.15), 0 1px 0 rgba(255,255,255,0.2) inset' }}
            whileHover={{ scale: 1.02 }}
            transition={SPRING}
          >
            {t('cta_final.cta_secondary')}
          </MotionLink>
        </div>
      </motion.div>
    </section>
  );
}
