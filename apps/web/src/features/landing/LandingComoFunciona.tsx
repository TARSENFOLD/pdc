import { motion } from 'motion/react';
import { useFadeUp } from './useFadeUp';

const PASSOS: Array<{ num: string; titulo: string; descricao: string }> = [
  {
    num: '01',
    titulo: 'Explora sem compromisso',
    descricao:
      'Visita experiências reais de instituições. Vê depoimentos, currículos e o dia a dia de quem já lá está. Tudo gratuito.',
  },
  {
    num: '02',
    titulo: 'Testa as tuas aptidões',
    descricao:
      'Faz simulações práticas que replicam tarefas reais da profissão. O sistema mede o teu desempenho e constrói o teu perfil vocacional.',
  },
  {
    num: '03',
    titulo: 'Decide com evidência',
    descricao:
      'Recebe recomendações baseadas no teu comportamento real — não num questionário de 5 minutos. Conecta-te com mentores e instituições.',
  },
];

export function LandingComoFunciona() {
  const fadeUp = useFadeUp();

  return (
    <section id="como-funciona" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div {...fadeUp} className="mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Como funciona
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold text-text-primary sm:text-4xl">
            Três passos para uma decisão que não vais arrepender-te.
          </h2>
        </motion.div>

        {/* Editorial no-card grid — separated by vertical dividers */}
        <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {PASSOS.map((passo, i) => (
            <motion.div
              key={passo.num}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' }}
              className="px-0 py-10 md:px-10 md:py-0 first:pl-0 last:pr-0"
            >
              <span className="font-display text-5xl font-bold leading-none text-border">
                {passo.num}
              </span>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-text-primary">
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
