import { motion } from 'motion/react';
import { useFadeUp } from './useFadeUp';

const PASSOS: Array<{ num: string; titulo: string; descricao: string }> = [
  {
    num: '1',
    titulo: 'Simula uma profissão',
    descricao:
      'Escolhe uma área e entra numa simulação prática que replica situações reais do dia a dia profissional.',
  },
  {
    num: '2',
    titulo: 'A plataforma analisa',
    descricao:
      'As tuas acções, tempo e decisões geram um perfil vocacional único - baseado em comportamento, não em respostas a questionários.',
  },
  {
    num: '3',
    titulo: 'Decides com clareza',
    descricao:
      'Recebes recomendações de cursos e áreas alinhadas ao teu perfil real. Sem adivinhação.',
  },
];

export function LandingComoFunciona() {
  const fadeUp = useFadeUp();

  return (
    <section id="como-funciona" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div {...fadeUp} className="mb-16 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber">
            Como funciona
          </span>
          <h2 className="mt-4 text-3xl font-bold text-text-primary sm:text-4xl">
            Três passos. Uma decisão segura.
          </h2>
          <div className="mx-auto mt-8 h-px w-2/3 bg-linear-to-r from-transparent via-amber/30 to-transparent" />
        </motion.div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {PASSOS.map((passo, i) => (
            <motion.div
              key={passo.num}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' }}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl border border-amber/20 bg-amber/10 text-2xl font-bold text-amber">
                {passo.num}
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-text-primary">
                {passo.titulo}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {passo.descricao}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
