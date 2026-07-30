import { Link, useSearchParams } from 'react-router-dom';
import { GraduationCap, UserCheck, Building2, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthDivider, OAuthButtons } from './OAuthButtons';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

export function EscolhaTipoContaPage() {
  const { t } = useTranslation('common');
  const { t: tRaw } = useI18nTranslation('common');
  const [searchParams] = useSearchParams();
  const { isEnabled } = useFeatureFlags();
  const externalCreatorEnabled = isEnabled('external_creator_onboarding_enabled');
  const area = searchParams.get('area');
  const query = area ? `?area=${area}` : '';

  const TIPOS = [
    {
      id: 'estudante',
      icon: GraduationCap,
      titulo: t('auth.roles.student.title'),
      descricao: t('auth.roles.student.desc'),
      href: '/criar-conta/estudante',
      features: tRaw('auth.roles.student.features', { returnObjects: true }) as string[],
    },
    {
      id: 'mentor',
      icon: UserCheck,
      titulo: t('auth.roles.mentor.title'),
      descricao: t('auth.roles.mentor.desc'),
      href: '/criar-conta/mentor',
      features: tRaw('auth.roles.mentor.features', { returnObjects: true }) as string[],
    },
    {
      id: 'instituicao',
      icon: Building2,
      titulo: t('auth.roles.institution.title'),
      descricao: t('auth.roles.institution.desc'),
      href: '/criar-conta/instituicao',
      features: tRaw('auth.roles.institution.features', { returnObjects: true }) as string[],
    },
  ];

  return (
    <div className="min-h-screen bg-canvas font-sans">
      {/* Role selection */}
      <div className="flex flex-col min-h-screen overflow-y-auto">
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-5xl">
            <motion.header
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10 text-center"
            >
              <div className="mb-4 inline-flex items-center rounded-full bg-elevated px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent border border-accent/20">
                {t('auth.onboarding.badge')}
              </div>
              <h1 className="font-authority text-4xl font-black tracking-tight text-ink-primary sm:text-5xl">
                {t('auth.onboarding.title')}
              </h1>
              <p className="mt-4 text-base text-ink-secondary">
                {t('auth.onboarding.subtitle')}
              </p>
            </motion.header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TIPOS.map((tipo, index) => (
                <motion.div
                  key={tipo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * (index + 1) }}
                  className="h-full"
                >
                  <Link
                    to={tipo.href + query}
                    aria-disabled={tipo.id !== 'estudante' && !externalCreatorEnabled}
                    onClick={(event) => {
                      if (tipo.id !== 'estudante' && !externalCreatorEnabled) event.preventDefault();
                    }}
                    className={`group relative flex flex-col min-h-[420px] overflow-hidden border border-ink-tertiary/10 bg-elevated rounded-2xl p-8 transition-all duration-300 ${
                      tipo.id !== 'estudante' && !externalCreatorEnabled
                        ? 'cursor-not-allowed opacity-60'
                        : 'hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/10 hover:-translate-y-1'
                    }`}
                  >
                    {/* Orbe de fundo */}
                    <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent/5 blur-3xl group-hover:bg-accent/15 transition-all duration-500" />
                    <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-accent/3 blur-2xl group-hover:bg-accent/8 transition-all duration-500" />

                    {/* Ícone */}
                    <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent mb-6 group-hover:bg-accent/20 group-hover:border-accent/40 transition-all duration-300">
                      <tipo.icon size={26} />
                    </div>

                    {/* Texto */}
                    <div className="relative z-10 flex-1">
                      <h2 className="text-xl font-bold text-ink-primary group-hover:text-accent transition-colors duration-300 leading-snug">
                        {tipo.titulo}
                      </h2>
                      <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                        {tipo.descricao}
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="relative z-10 mt-8 space-y-2.5">
                      {tipo.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-xs text-ink-tertiary">
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                            <Check size={9} strokeWidth={3} />
                          </div>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA bottom */}
                    <div className="relative z-10 mt-8 flex items-center justify-between border-t border-ink-tertiary/8 pt-5">
                      <span className="text-xs font-semibold text-ink-tertiary group-hover:text-accent transition-colors duration-300 uppercase tracking-wider">
                        {tipo.id !== 'estudante' && !externalCreatorEnabled
                          ? 'Temporariamente indisponível'
                          : t('auth.common.start')}
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-tertiary/15 text-ink-tertiary group-hover:bg-accent group-hover:border-accent group-hover:text-white group-hover:translate-x-1 transition-all duration-300">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="mx-auto mt-8 max-w-md">
              <AuthDivider />
              <OAuthButtons />
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-10 text-center text-sm text-ink-tertiary"
            >
              {t('auth.common.login_link_prefix')}{' '}
              <Link
                to="/login"
                className="font-bold text-accent hover:text-accent-hover underline underline-offset-4 transition-colors"
              >
                {t('auth.common.login_link_action')}
              </Link>
            </motion.p>
          </div>
        </div>
      </div>
    </div>
  );
}
