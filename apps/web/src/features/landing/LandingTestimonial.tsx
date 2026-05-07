import { motion } from 'motion/react';
import { useReducedMotion } from 'motion/react';

export function LandingTestimonial() {
  const reduced = useReducedMotion();

  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <blockquote>
            <p className="text-3xl font-bold leading-snug tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
              &ldquo;Passei dois anos num curso que não era para mim.
              Com o PDC, teria sabido{' '}
              <em className="italic text-amber">antes de entrar.</em>&rdquo;
            </p>
            <footer className="mt-10 flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber text-sm font-bold text-black">
                A
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Ana Luísa M.</p>
                <p className="text-xs text-text-muted">Estudante de Medicina, Luanda</p>
              </div>
            </footer>
          </blockquote>
        </motion.div>
      </div>
    </section>
  );
}
