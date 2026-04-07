import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { http } from '@/lib/api/http';
import { useReducedMotion } from 'motion/react';
import { Play, Building2, ArrowRight } from 'lucide-react';
import type { SimulacaoPublica, InstituicaoPublica, CatalogoResponse } from '@pdc/shared';

// ─── Skeletons ───────────────────────────────────────────────────────────────

function LandingDestaquesSkeleton() {
  return (
    <section className="bg-background px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center lg:text-left">
          <div className="h-10 w-64 rounded-lg bg-surface-raised mx-auto lg:mx-0 mb-4" />
          <div className="h-4 w-96 rounded-lg bg-surface-raised mx-auto lg:mx-0" />
        </div>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-border bg-surface p-5">
                  <div className="aspect-video w-full rounded-xl bg-surface-raised mb-4" />
                  <div className="h-3 w-16 bg-surface-raised mb-3 rounded" />
                  <div className="h-5 w-full bg-surface-raised mb-2 rounded" />
                  <div className="h-4 w-2/3 bg-surface-raised rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="h-4 w-32 bg-surface-raised rounded" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-surface-raised" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full bg-surface-raised rounded" />
                  <div className="h-3 w-1/2 bg-surface-raised rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function LandingDestaques() {
  const reduced = useReducedMotion();

  const fadeUp = {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5, ease: 'easeOut' },
  };

  const { data: simulacoes, isError: simError, isLoading: loadingSims } = useQuery({
    queryKey: ['landing-simulacoes'],
    queryFn: () => http.get<CatalogoResponse<SimulacaoPublica>>('/catalogo/simulacoes?limit=3&sort=updatedAt:desc'),
    retry: false,
  });

  const { data: instituicoes, isError: instError, isLoading: loadingInsts } = useQuery({
    queryKey: ['landing-instituicoes'],
    queryFn: () => http.get<CatalogoResponse<InstituicaoPublica>>('/catalogo/instituicoes?limit=6'),
    retry: false,
  });

  if (loadingSims || loadingInsts) {
    return <LandingDestaquesSkeleton />;
  }

  // Regra zero mocks: se houver erro ou não houver dados em simulações, não renderiza nada
  if (simError || instError || !simulacoes?.data?.length) {
    return null;
  }

  return (
    <section className="bg-background px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="mb-12 text-center lg:text-left">
          <h2 className="text-3xl font-bold text-text-primary sm:text-4xl">
            Em destaque agora
          </h2>
          <p className="mt-4 text-text-secondary">
            Explora as simulações mais populares e as instituições parceiras.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Simulações Col */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {simulacoes.data.map((sim: SimulacaoPublica, i: number) => (
                <motion.div
                  key={sim.id}
                  {...fadeUp}
                  transition={{ delay: i * 0.1 }}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:border-amber/20"
                >
                  <div className="aspect-video w-full overflow-hidden">
                    {sim.capaUrl ? (
                      <img
                        src={sim.capaUrl}
                        alt={sim.titulo}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-surface-raised text-text-muted">
                        <Play size={40} />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber">
                      {sim.area || 'Geral'}
                    </span>
                    <h3 className="mt-2 text-lg font-bold text-text-primary line-clamp-1">
                      {sim.titulo}
                    </h3>
                    <p className="mt-2 text-sm text-text-secondary line-clamp-2">
                      {sim.descricao}
                    </p>
                    <Link
                      to={`/simulacoes/${sim.slug || sim.id}`}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber transition-colors hover:text-amber-hover"
                    >
                      Experimentar <ArrowRight size={14} />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Instituições Col */}
          <div className="flex flex-col gap-6">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-text-muted">
              <Building2 size={14} /> Instituições parceiras
            </h3>
            <div className="flex flex-col gap-3">
              {instituicoes?.data?.map((inst: InstituicaoPublica, i: number) => (
                <motion.div
                  key={inst.id}
                  {...fadeUp}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-surface-raised"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber/10 text-amber">
                    {inst.logoUrl ? (
                      <img src={inst.logoUrl} alt={inst.nome} className="h-full w-full rounded-lg object-contain" />
                    ) : (
                      <Building2 size={20} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-text-primary">{inst.nome}</p>
                    <p className="truncate text-xs text-text-muted">{inst.regiao || 'Angola'}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <Link
              to="/instituicoes"
              className="mt-2 text-xs font-medium text-text-muted transition-colors hover:text-amber"
            >
              Ver todas as instituições →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
