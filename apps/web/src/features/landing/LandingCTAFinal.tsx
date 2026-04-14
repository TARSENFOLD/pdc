import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useFadeUp } from './useFadeUp';

export function LandingCTAFinal() {
  const fadeUp = useFadeUp();

  return (
    <section className="px-4 py-24 sm:px-6">
      <motion.div
        {...fadeUp}
        className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-amber px-8 py-16 text-center"
      >
        <h2 className="text-3xl font-bold text-black sm:text-4xl">Pronto para experimentar?</h2>
        <p className="mx-auto mt-4 max-w-lg text-base text-black/70">
          Cria a tua conta em segundos e começa a explorar simulações reais.
          Gratuito. Sem compromisso.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            to="/criar-conta"
            className="w-full rounded-xl bg-black px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-black/80 hover:scale-[1.02] sm:w-auto"
          >
            Criar conta grátis
          </Link>
          <Link
            to="/login"
            className="w-full rounded-xl border border-black/20 bg-transparent px-8 py-3.5 text-base font-semibold text-black transition-colors hover:bg-black/10 sm:w-auto"
          >
            Já tenho conta
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
