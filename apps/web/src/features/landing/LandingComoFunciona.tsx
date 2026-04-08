import { motion } from 'motion/react';
import { useFadeUp } from './useFadeUp';

const PASSOS: Array<{ titulo: string; descricao: string }> = [
  {
    titulo: 'Explora e simula',
    descricao:
      'Escolhe uma área de interesse e faz simulações práticas que replicam o dia a dia real da profissão.',
  },
  {
    titulo: 'O sistema aprende',
    descricao:
      'Cada acção tua — tempo, escolhas, resultados — gera um perfil vocacional baseado em comportamento real.',
  },
  {
    titulo: 'Decides com evidência',
    descricao:
      'Recebes um relatório vocacional personalizado com recomendações de cursos alinhadas ao teu perfil.',
  },
];

export function LandingComoFunciona() {
  const fadeUp = useFadeUp();

  return (
    <section id="como-funciona" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div {...fadeUp} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber">
            Como funciona
          </span>
          <h2 className="mt-4 text-3xl font-bold text-text-primary sm:text-4xl">
            Três passos para uma decisão segura
          </h2>
        </motion.div>

        <div className="relative mt-16">
          <div className="absolute left-1/2 top-8 hidden h-px w-[66%] -translate-x-1/2 bg-linear-to-r from-transparent via-amber/30 to-transparent lg:block" />

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            {PASSOS.map((passo, i) => (
              <motion.div
                key={passo.titulo}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.15, ease: 'easeOut' }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber/30 bg-amber/10 text-2xl font-bold text-amber">
                  {i + 1}
                </div>
                <h3 className="mb-3 text-lg font-semibold text-text-primary">{passo.titulo}</h3>
                <p className="text-sm leading-relaxed text-text-secondary">{passo.descricao}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
