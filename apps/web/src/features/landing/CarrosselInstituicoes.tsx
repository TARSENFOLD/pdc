import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { http } from '@/lib/api/http';
import type { InstituicaoPublica, CatalogoResponse } from '@pdc/shared';

// ─── Component ────────────────────────────────────────────────────────────────

export function CarrosselInstituicoes() {
  const [active, setActive] = useState(0);
  const paused = useRef(false);
  const reduced = useReducedMotion();

  const { data: instituicoes, isError } = useQuery({
    queryKey: ['landing-carrossel-instituicoes'],
    queryFn: () => http.get<CatalogoResponse<InstituicaoPublica>>('/catalogo/instituicoes?limit=8'),
    retry: false,
  });

  const items = instituicoes?.data ?? [];

  useEffect(() => {
    if (items.length === 0) return;
    const id = setInterval(() => {
      if (!paused.current) setActive((i) => (i + 1) % items.length);
    }, 4000);
    return () => { clearInterval(id); };
  }, [items.length]);

  // Regra zero mocks: sem dados reais, não renderiza
  if (isError || items.length === 0) return null;

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
          {items.map((inst, i) => (
            <motion.div
              key={inst.id}
              initial={false}
              animate={{
                opacity: i === active ? 1 : 0.4,
                scale: reduced ? 1 : i === active ? 1.05 : 0.95,
              }}
              transition={{ duration: 0.3 }}
              className="flex min-w-[150px] flex-col items-center gap-2 rounded-2xl border border-border bg-surface-raised px-5 py-4"
            >
              {inst.logoUrl ? (
                <img src={inst.logoUrl} alt={inst.nome} className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <span className="text-lg font-bold text-amber">{inst.nome.charAt(0)}</span>
              )}
              <span className="text-center text-xs text-text-secondary line-clamp-2">{inst.nome}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
