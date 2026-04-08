import { motion } from 'motion/react';
import { FlaskConical, BarChart3, GraduationCap, Building2, Users, Bot } from 'lucide-react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { useFadeUp } from './useFadeUp';

const FEATURES: Array<{ icon: ComponentType<LucideProps>; titulo: string; descricao: string }> = [
  {
    icon: FlaskConical,
    titulo: 'Simulações práticas',
    descricao: 'Três tipos de simulação — vídeo guiado, laboratório externo e ambiente interativo — para cada área profissional.',
  },
  {
    icon: BarChart3,
    titulo: 'Perfil Vocacional',
    descricao: 'Calculado automaticamente a partir do teu comportamento real em cada simulação, não de questionários.',
  },
  {
    icon: GraduationCap,
    titulo: 'Cursos com certificado',
    descricao: 'Módulos, tarefas, submissões e certificados emitidos pelas instituições parceiras.',
  },
  {
    icon: Building2,
    titulo: 'Experiências institucionais',
    descricao: 'Programas e experiências publicadas por universidades e escolas — gratuitas e abertas.',
  },
  {
    icon: Users,
    titulo: 'Mentorias reais',
    descricao: 'Conecta-te com mentores da indústria angolana para orientação personalizada na tua área.',
  },
  {
    icon: Bot,
    titulo: 'AI Tutor',
    descricao: 'Tutor com IA que responde às tuas dúvidas com contexto do teu perfil e do conteúdo da plataforma.',
  },
];

export function LandingFeatures() {
  const fadeUp = useFadeUp();

  return (
    <section id="features" className="bg-surface-alt px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber">
            Funcionalidades
          </span>
          <h2 className="mt-4 text-3xl font-bold text-text-primary sm:text-4xl">
            Tudo o que precisas, num só lugar
          </h2>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.article
              key={feature.titulo}
              {...fadeUp}
              transition={{ duration: 0.45, delay: i * 0.07, ease: 'easeOut' }}
              className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-amber/20 hover:bg-amber/[0.03]"
            >
              <div className="mb-4 text-amber"><feature.icon size={20} aria-hidden={true} /></div>
              <h3 className="mb-2 font-semibold text-text-primary">{feature.titulo}</h3>
              <p className="text-sm leading-relaxed text-text-secondary">{feature.descricao}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
