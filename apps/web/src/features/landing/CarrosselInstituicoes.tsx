import { useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner } from '@/components/ui';
import type { InstituicaoPublica } from '@pdc/shared';

// ─── Card 3D ──────────────────────────────────────────────────────────────────

function InstCard({ inst }: { inst: InstituicaoPublica }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (shouldReduceMotion) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotateX = ((y - cy) / cy) * -10;
    const rotateY = ((x - cx) / cx) * 10;
    el.style.transform = `perspective(600px) rotateX(${String(rotateX)}deg) rotateY(${String(rotateY)}deg) scale3d(1.04,1.04,1.04)`;
  }, [shouldReduceMotion]);

  const onMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
  }, []);

  return (
    <motion.a
      ref={cardRef}
      href={`/instituicoes/${inst.slug ?? inst.id}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 220, damping: 28 }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        willChange: 'transform',
        borderColor: 'var(--card-border, #000000)',
        backgroundColor: 'var(--surface-elevated)',
      }}
      className="group relative flex w-52 shrink-0 flex-col items-center gap-4 rounded-2xl border-2 p-6 text-center shadow-sm cursor-pointer"
    >
      {/* Glow no hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ boxShadow: '0 8px 32px rgba(182,95,42,0.18)' }} />

      {/* Logo */}
      <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-white/80 p-2 shadow-inner"
        style={{ borderColor: 'rgba(0,0,0,0.15)' }}>
        {inst.logoUrl ? (
          <img src={inst.logoUrl} alt={inst.nome} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xl font-black" style={{ color: 'var(--accent-terracotta)' }}>
            {inst.nome.substring(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold leading-tight tracking-tight" style={{ color: 'var(--ink-primary)' }}>
          {inst.nome}
        </span>
        {inst.regiao && (
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-terracotta)', opacity: 0.7 }}>
            {inst.regiao}
          </span>
        )}
        {inst.tipo && (
          <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: 'rgba(182,95,42,0.1)', color: 'var(--accent-terracotta)' }}>
            {inst.tipo}
          </span>
        )}
      </div>
    </motion.a>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CarrosselInstituicoes() {
  const { data: res, isLoading, isError } = useQuery({
    queryKey: ['landing-carrossel-instituicoes'],
    queryFn: () => catalogoApi.getInstituicoes({ pageSize: 15 }),
    staleTime: 1000 * 60 * 30,
  });

  const items = res?.data ?? [];

  if (isError || (items.length === 0 && !isLoading)) return null;

  return (
    <section className="py-16 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: 'var(--ink-tertiary)' }}>
            Instituições de Prestígio em Angola
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4 opacity-20">
            <Spinner size="sm" />
          </div>
        ) : (
          <div className="relative">
            {/* Máscaras laterais */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-20 bg-gradient-to-r from-canvas to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-20 bg-gradient-to-l from-canvas to-transparent" />

            {/* Marquee automático */}
            <div className="flex gap-5 animate-inst-marquee">
              {[...items, ...items].map((inst, i) => (
                <InstCard key={`${inst.id}-${String(i)}`} inst={inst} />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes inst-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-inst-marquee {
          animation: inst-marquee 35s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-inst-marquee {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
