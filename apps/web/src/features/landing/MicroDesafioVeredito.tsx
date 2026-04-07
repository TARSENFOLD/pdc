import { motion } from 'motion/react';
import { FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Veredito } from './microDesafioData';

// ─── Component ────────────────────────────────────────────────────────────────

export function MicroDesafioVeredito({ veredito, onReiniciar, reduced }: {
  veredito: Veredito; onReiniciar: () => void; reduced: boolean | null;
}) {
  const f = {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, y: -16 },
    transition: { duration: 0.35, ease: 'easeOut' },
  };

  return (
    <motion.div {...f} className="flex flex-col items-center gap-5 text-center">
      {/* Score ring */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber bg-amber/10">
        <span className="text-2xl font-bold text-amber">{veredito.score}%</span>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-text-muted">Área sugerida</p>
        <h3 className="mt-1 text-xl font-bold text-text-primary">{veredito.area}</h3>
      </div>

      <div className="rounded-xl bg-surface-raised px-4 py-3">
        <p className="text-xs text-text-muted">Arquétipo</p>
        <p className="text-sm font-medium text-text-primary">{veredito.arquetipo}</p>
      </div>

      <p className="text-sm text-text-secondary">{veredito.proximoPasso}</p>

      {/* Recommended simulations */}
      {veredito.simulacoes.length > 0 && (
        <div className="w-full space-y-2">
          <p className="text-xs uppercase tracking-widest text-text-muted">Simulações recomendadas</p>
          {veredito.simulacoes.map((sim) => (
            <Link
              key={sim}
              to={`/simulacoes/${sim.toLowerCase().replace(/\s+/g, '-')}`}
              className="block rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-text-secondary transition-colors hover:border-amber/30 hover:text-text-primary"
            >
              <FlaskConical size={14} aria-hidden={true} className="inline-block mr-1" /> {sim}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          to="/criar-conta"
          className="rounded-xl bg-amber px-6 py-2.5 text-sm font-semibold text-black transition-all hover:scale-[1.02] hover:bg-amber-hover"
        >
          Criar conta e explorar
        </Link>
        <button
          onClick={onReiniciar}
          className="rounded-xl border border-border px-6 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-raised"
        >
          Repetir desafio
        </button>
      </div>

      <Link
        to="/explorar"
        className="text-sm text-text-muted transition-colors hover:text-text-secondary"
      >
        Explorar a plataforma →
      </Link>
    </motion.div>
  );
}
