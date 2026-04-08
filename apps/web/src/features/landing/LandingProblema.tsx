import { motion } from 'motion/react';
import { Dices, DollarSign, TrendingDown } from 'lucide-react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { useFadeUp } from './useFadeUp';

const PROBLEMAS: Array<{ icon: ComponentType<LucideProps>; title: string; body: string }> = [
  {
    icon: Dices,
    title: 'Escolha às cegas',
    body: 'A maioria dos estudantes escolhe o curso baseada em pressão familiar ou suposições sobre o mercado de trabalho.',
  },
  {
    icon: DollarSign,
    title: 'Custo humano e financeiro',
    body: 'Matricular, reprovar e abandonar desperdiça anos e recursos escassos de famílias e do Estado.',
  },
  {
    icon: TrendingDown,
    title: 'Mercado desalinhado',
    body: 'As instituições enchem vagas que depois ficam vazias. O mercado precisa de profissionais que as escolas não conseguem reter.',
  },
];

export function LandingProblema() {
  const fadeUp = useFadeUp();

  return (
    <section id="problema" className="bg-surface-alt px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <motion.div {...fadeUp} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber">O problema</span>
          <h2 className="mt-4 text-3xl font-bold text-text-primary sm:text-4xl">
            Angola perde 6 em cada 10 estudantes no primeiro ano
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-secondary">
            Cerca de 60% dos estudantes universitários angolanos abandonam o curso no primeiro ano.
            O motivo? Escolheram sem conhecer. Sem experimentar. Sem evidência.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {PROBLEMAS.map((item, i) => (
            <motion.div
              key={item.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <div className="mb-4 text-amber"><item.icon size={20} aria-hidden={true} /></div>
              <h3 className="mb-2 font-semibold text-text-primary">{item.title}</h3>
              <p className="text-sm leading-relaxed text-text-secondary">{item.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
