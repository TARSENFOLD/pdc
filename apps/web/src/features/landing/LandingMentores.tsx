import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { http } from '@/lib/api/http';
import type { MentorPublico, CatalogoResponse } from '@pdc/shared';
import { useTranslation } from '@/hooks/useTranslation';

export function LandingMentores() {
  const reduced = useReducedMotion();
  const { t } = useTranslation('landing');
  const fadeUp = {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 },
  };

  const { data: mentores, isError } = useQuery({
    queryKey: ['landing-mentores'],
    queryFn: () => http.get<CatalogoResponse<MentorPublico>>('/catalogo/mentores?limit=4'),
    retry: false,
  });

  // Se erro ou vazio, não renderiza seção (Regra zero mocks)
  if (isError || !mentores?.data.length) return null;

  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div {...fadeUp} className="mb-16 text-center">
          <h2 className="text-2xl font-bold text-text-primary sm:text-3xl lg:text-4xl">
            {t('mentores.title')}
          </h2>
          <p className="mt-4 text-text-secondary">
            {t('mentores.body')}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {mentores.data.map((m: MentorPublico, i: number) => (
            <motion.div
              key={m.id}
              {...fadeUp}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border-2 p-6 text-center transition-all"
              style={{ borderColor: 'var(--card-border)', boxShadow: '0 2px 12px rgba(0,0,0,0.10)' }}
              whileHover={{ boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber/10 text-amber">
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt={m.nome} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <img src="/images/perfis/avatar-mentor.svg" alt="" className="h-8 w-8" />
                )}
              </div>
              <h3 className="font-bold text-text-primary">{m.nome}</h3>
              <p className="text-xs text-text-secondary mt-1 line-clamp-1">{m.areaEspecialidade}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link to="/mentores" className="inline-block rounded-tr-2xl rounded-bl-2xl rounded-tl-sm rounded-br-sm bg-amber px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-hover">
            {t('mentores.cta')} →
          </Link>
        </div>
      </div>
    </section>
  );
}
