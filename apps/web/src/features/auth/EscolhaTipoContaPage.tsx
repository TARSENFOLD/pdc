import { Link, useSearchParams } from 'react-router-dom';
import { GraduationCap, UserCheck, Building2, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from '@/hooks/useTranslation';

export function EscolhaTipoContaPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const area = searchParams.get('area');
  const query = area ? `?area=${area}` : '';

  const TIPOS = [
    {
      id: 'estudante',
      icon: GraduationCap,
      titulo: t('auth.roles.student.title', 'Estudante'),
      descricao: t('auth.roles.student.desc', 'Descobre a tua vocação e explora carreiras com IA.'),
      href: '/criar-conta/estudante',
      features: [
        'Simulações vocacionais',
        'Perfil vocacional IA',
        'Mentorias personalizadas',
        'Cursos e certificados',
      ],
      color: 'bg-accent/10 border-accent/20 text-accent',
    },
    {
      id: 'mentor',
      icon: UserCheck,
      titulo: t('auth.roles.mentor.title', 'Mentor'),
      descricao: t('auth.roles.mentor.desc', 'Orienta estudantes e partilha o teu conhecimento.'),
      href: '/criar-conta/mentor',
      features: [
        'Criar cursos e simulações',
        'Gerir mentorados',
        'Analytics de impacto',
        'Reputação profissional',
      ],
      color: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    },
    {
      id: 'instituicao',
      icon: Building2,
      titulo: t('auth.roles.institution.title', 'Instituição'),
      descricao: t('auth.roles.institution.desc', 'Atrai talentos e apresenta os teus cursos.'),
      href: '/criar-conta/instituicao',
      features: [
        'Página institucional',
        'Publicar experiências',
        'Propostas a estudantes',
        'Relatórios de evasão',
      ],
      color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    },
  ] as const;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-5xl">
        <header className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 inline-flex items-center rounded-full bg-elevated px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent border border-accent/20"
          >
            {t('auth.onboarding.badge', 'PDC - Onboarding')}
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-black tracking-tight text-ink-primary sm:text-5xl"
          >
            {t('auth.onboarding.title', 'Como queres usar o PDC?') }
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-lg text-ink-secondary"
          >
            {t('auth.onboarding.subtitle', 'Escolhe o teu perfil para personalizar a tua infraestrutura de decisão.')}
          </motion.p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {TIPOS.map((t, index) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
            >
              <Link 
                to={t.href + query}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-ink-tertiary/10 bg-elevated p-8 transition-all hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/5"
              >
                <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border ${t.color}`}>
                  <t.icon size={28} />
                </div>
                
                <h2 className="text-2xl font-bold text-ink-primary group-hover:text-accent transition-colors">
                  {t.titulo}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                  {t.descricao}
                </p>

                <ul className="mt-8 space-y-3 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-ink-tertiary">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 text-accent">
                        <Check size={12} strokeWidth={3} />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-10 flex items-center justify-between font-bold text-ink-primary">
                  <span className="text-sm">Começar</span>
                  <div className="h-8 w-8 rounded-full bg-elevated border border-ink-tertiary/10 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all group-hover:translate-x-1">
                    →
                  </div>
                </div>

                {/* Efeito de Vidro no Fundo */}
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-accent/5 blur-3xl transition-opacity group-hover:bg-accent/10" />
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center text-sm text-ink-tertiary"
        >
          {t('auth.common.login_link_prefix', 'Já tens uma conta ativa?')}{' '}
          <Link to="/login" className="font-bold text-accent hover:text-accent-hover underline underline-offset-4 transition-colors">
            {t('auth.common.login_link_action', 'Entrar agora')}
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
