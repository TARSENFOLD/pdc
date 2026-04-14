import { motion } from 'motion/react';
import { Compass, Clock, Shuffle } from 'lucide-react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { useFadeUp } from './useFadeUp';

const PROBLEMAS: Array<{ icon: ComponentType<LucideProps>; title: string; body: string }> = [
  {
    icon: Compass,
    title: 'Escolha sem referência',
    body: 'A maioria dos estudantes escolhe o curso sem nunca ter experimentado a profissão. Decidem com base em opinião de terceiros.',
  },
  {
    icon: Clock,
    title: 'Tempo e dinheiro perdidos',
    body: 'Quem descobre tarde que o curso não é o certo perde semestres inteiros e recursos que podiam ser investidos melhor.',
  },
  {
    icon: Shuffle,
    title: 'Desalinhamento com o mercado',
    body: 'Estudantes formam-se em áreas saturadas enquanto o mercado angolano precisa de perfis que ficam por preencher.',
  },
];

export function LandingProblema() {
  const fadeUp = useFadeUp();

  return (
    <section id="problema" className="bg-surface-alt px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <motion.div {...fadeUp} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber">O desafio</span>
          <h2 className="mt-4 text-3xl font-bold text-text-primary sm:text-4xl">
            Escolher um curso não devia ser um salto no escuro
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-secondary">
            Todos os anos, milhares de estudantes angolanos entram em cursos que não conhecem.
            O resultado? Frustração, mudanças tardias e potencial desperdiçado.
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
