import { motion } from 'motion/react';
import { FlaskConical, BarChart3, GraduationCap, Building2, Users, Bot } from 'lucide-react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { useFadeUp } from './useFadeUp';
import { useTranslation } from '@/hooks/useTranslation';

const FEATURES_ICONS: ComponentType<LucideProps>[] = [FlaskConical, BarChart3, GraduationCap, Building2, Users, Bot];
const FEATURES_KEYS = ['simulacoes', 'perfil', 'cursos', 'experiencias', 'mentoria', 'ia'] as const;

export function LandingFeatures() {
  const fadeUp = useFadeUp();
  const { t } = useTranslation('landing');

  return (
    <section id="features" className="bg-surface-alt px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber">
            {t('features.kicker')}
          </span>
          <h2 className="mt-4 text-3xl font-bold text-text-primary sm:text-4xl">
            {t('features.title')}
          </h2>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES_KEYS.map((key, i) => {
            const Icon = FEATURES_ICONS[i] as ComponentType<LucideProps>;
            return (
              <motion.article
                key={key}
                {...fadeUp}
                transition={{ duration: 0.45, delay: i * 0.07, ease: 'easeOut' }}
                className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-amber/20 hover:bg-amber/[0.03]"
              >
                <div className="mb-4 text-amber"><Icon size={20} aria-hidden={true} /></div>
                <h3 className="mb-2 font-semibold text-text-primary">{t(`features.items.${key}_title`)}</h3>
                <p className="text-sm leading-relaxed text-text-secondary">{t(`features.items.${key}_body`)}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
