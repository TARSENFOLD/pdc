import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { http } from '@/lib/api/http';
import type { MentorPublico, CatalogoResponse } from '@pdc/shared';

export function LandingMentores() {
  const reduced = useReducedMotion();
  const fadeUp = {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 },
  };

  const { data: mentores, isError } = useQuery({
    queryKey: ['landing-mentores'],
    queryFn: () => http.get<CatalogoResponse<MentorPublico>>('/catalogo/mentores?limit=4'),
    retry: false,
  });

  // Se erro ou vazio, não renderiza seção (Regra zero mocks)
  if (isError || !mentores?.data.length) return null;

  return (
    <section className="bg-surface-alt px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div {...fadeUp} className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-text-primary sm:text-4xl">
            Aprende com quem já está lá
          </h2>
          <p className="mt-4 text-text-secondary">
            Conecta-te com profissionais da indústria angolana para orientação personalizada.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {mentores.data.map((m: MentorPublico, i: number) => (
            <motion.div
              key={m.id}
              {...fadeUp}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-surface p-6 text-center transition-all hover:border-amber/20"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber/10 text-amber">
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt={m.nome} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <img src="/images/perfis/avatar-mentor.svg" alt="" className="h-8 w-8" />
                )}
              </div>
              <h3 className="font-bold text-text-primary">{m.nome}</h3>
              <p className="text-xs text-text-secondary mt-1 line-clamp-1">{m.areaEspecialidade}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link to="/app/mentores" className="inline-block rounded-xl bg-amber px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-hover">
            Conhecer mentores →
          </Link>
        </div>
      </div>
    </section>
  );
}
