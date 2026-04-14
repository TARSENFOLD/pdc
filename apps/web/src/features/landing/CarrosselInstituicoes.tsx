import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
          {items.map((inst, i) => {
            const card = (
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
                  <img src="/images/placeholder/logo-default.svg" alt="" className="h-10 w-10 rounded-lg" />
                )}
                <span className="text-center text-xs text-text-secondary line-clamp-2">{inst.nome}</span>
                {inst.tipo && (
                  <span className="rounded-full bg-amber/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber">
                    {inst.tipo}
                  </span>
                )}
                {inst.regiao && (
                  <span className="text-[10px] text-text-muted">{inst.regiao}</span>
                )}
              </motion.div>
            );

            return inst.slug ? (
              <Link key={inst.id} to={`/instituicoes/${inst.slug}`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber rounded-2xl">
                {card}
              </Link>
            ) : card;
          })}
        </div>
      </div>
    </section>
  );
}
