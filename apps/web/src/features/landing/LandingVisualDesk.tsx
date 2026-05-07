import { motion } from 'motion/react';
import { useFadeUp } from './useFadeUp';

export function LandingVisualDesk() {
  const fadeUp = useFadeUp();

  return (
    // Removido o overflow-hidden para permitir que a luz da vinheta "vaze" para as outras secções
    <section className="relative flex justify-center px-4 pb-32 pt-16">
      {/* Vinheta Terracota Esticada (Halo de luz mais intenso para visibilidade no modo claro) */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[60%] w-[60%] max-w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-[100%] bg-[#D2691E]/50 blur-[80px] sm:blur-[120px]" />

      <div className="relative z-10 w-full max-w-5xl">
        <motion.div
          {...fadeUp}
          className="relative z-10 flex justify-center"
        >
          <img
            src="/desk.webp"
            alt="Ambiente PDC"
            className="w-full h-auto drop-shadow-2xl transition-transform duration-700 hover:scale-[1.01]"
          />
        </motion.div>
      </div>
    </section>
  );
}

