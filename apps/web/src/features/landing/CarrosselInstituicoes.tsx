import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

// ─── Data ─────────────────────────────────────────────────────────────────────

const INSTITUICOES = [
  { sigla: 'UCAN', nome: 'Universidade Católica de Angola' },
  { sigla: 'UAN', nome: 'Universidade Agostinho Neto' },
  { sigla: 'UPRA', nome: 'Universidade Privada de Angola' },
  { sigla: 'ISPTEC', nome: 'Inst. Sup. Politécnico de Tecnologias e Ciências' },
  { sigla: 'UJES', nome: 'Universidade José Eduardo dos Santos' },
  { sigla: 'ISPAJ', nome: 'Inst. Sup. Politécnico Alvorecer da Juventude' },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function CarrosselInstituicoes() {
  const [active, setActive] = useState(0);
  const paused = useRef(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const id = setInterval(() => {
      if (!paused.current) setActive((i) => (i + 1) % INSTITUICOES.length);
    }, 4000);
    return () => { clearInterval(id); };
  }, []);

  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl text-center">
        <p className="mb-8 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Instituições parceiras
        </p>
        <div
          className="flex justify-center gap-4 overflow-x-auto pb-2"
          onMouseEnter={() => { paused.current = true; }}
          onMouseLeave={() => { paused.current = false; }}
        >
          {INSTITUICOES.map((inst, i) => (
            <motion.div
              key={inst.sigla}
              initial={false}
              animate={{
                opacity: i === active ? 1 : 0.4,
                scale: reduced ? 1 : i === active ? 1.05 : 0.95,
              }}
              transition={{ duration: 0.3 }}
              className="flex min-w-[150px] flex-col items-center gap-2 rounded-2xl border border-border bg-surface-raised px-5 py-4"
            >
              <span className="text-lg font-bold text-amber">{inst.sigla}</span>
              <span className="text-center text-xs text-text-secondary">{inst.nome}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
