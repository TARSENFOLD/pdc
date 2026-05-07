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
    <motion.div {...f} className="flex flex-col items-center gap-6 text-center">
      {/* Score ring (Premium DataViz) */}
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-accent/30 bg-accent/5 shadow-[0_0_40px_rgba(255,92,0,0.1)]">
        <div className="absolute inset-1 rounded-full border border-dashed border-accent/20 animate-[spin_20s_linear_infinite]" />
        <span className="font-mono text-3xl font-bold tracking-tighter text-accent">{veredito.score}%</span>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Compatibilidade Detectada</p>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">{veredito.area}</h3>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/5 px-5 py-3 backdrop-blur-md">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Arquétipo Dominante</p>
        <p className="text-sm font-semibold text-accent">{veredito.arquetipo}</p>
      </div>

      <p className="max-w-xs text-sm leading-relaxed text-text-secondary">{veredito.proximoPasso}</p>

      {/* Recommended simulations (Elite Selection) */}
      {veredito.simulacoes.length > 0 && (
        <div className="w-full space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Trajetórias Recomendadas</p>
          {veredito.simulacoes.map((sim) => (
            <Link
              key={sim}
              to={`/simulacoes/${sim.toLowerCase().replace(/\s+/g, '-')}`}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-text-secondary transition-all hover:border-accent/40 hover:bg-accent/5 hover:text-text-primary group"
            >
              <div className="flex items-center gap-2">
                <FlaskConical size={14} aria-hidden={true} className="text-accent/60 group-hover:text-accent" />
                <span className="font-medium">{sim}</span>
              </div>
              <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest text-accent">Testar →</span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col items-center gap-4 w-full">
        <Link
          to={`/register?area=${veredito.area.toUpperCase()}`}
          className="w-full rounded-tr-2xl rounded-bl-2xl rounded-tl-sm rounded-br-sm bg-accent px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.03] hover:bg-accent-hover active:scale-[0.98]"
        >
          Resgatar Perfil Completo
        </Link>
        <button
          onClick={onReiniciar}
          className="text-xs font-bold uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors"
        >
          Repetir Diagnóstico
        </button>
      </div>

      <Link
        to={`/explorar?area=${veredito.area.toUpperCase()}`}
        className="mt-2 text-xs font-medium text-accent/60 hover:text-accent transition-colors underline underline-offset-4 decoration-accent/20"
      >
        Explorar catálogos públicos como convidado
      </Link>
    </motion.div>
  );
}
