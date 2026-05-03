import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { http } from '@/lib/api/http';
import { Play, Building2, ChevronRight } from 'lucide-react';
import type { SimulacaoPublica, InstituicaoPublica, CatalogoResponse } from '@pdc/shared';
import { useTranslation } from '@/hooks/useTranslation';

const PLACEHOLDER_COLORS: Record<string, { from: string; to: string }> = {
  tecnologia: { from: '#3b82f6', to: '#1d4ed8' },
  saude: { from: '#ef4444', to: '#b91c1c' },
  engenharia: { from: '#10b981', to: '#047857' },
  gestao: { from: '#f59e0b', to: '#b45309' },
  default: { from: '#f59e0b', to: '#b45309' },
};

function getPlaceholderColors(area?: string): { from: string; to: string } {
  const key = (area ?? '').toLowerCase();
  const found = PLACEHOLDER_COLORS[key];
  if (found) return found;
  return PLACEHOLDER_COLORS.default as { from: string; to: string };
}

// ─── Skeletons ───────────────────────────────────────────────────────────────

function LandingDestaquesSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse">
      <div className="h-8 w-64 bg-surface-raised mb-12 rounded-lg" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-surface-raised rounded-2xl" />)}
        <div className="space-y-4 sm:col-span-2 lg:col-span-1">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-surface-raised rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LandingDestaques() {
  const reduced = useReducedMotion();
  const { t } = useTranslation('landing');
  const fadeUp = {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 },
  };

  const { data: simulacoes, isLoading: loadingSims, isError: simError } = useQuery({
    queryKey: ['landing-destaques-sims'],
    queryFn: () => http.get<CatalogoResponse<SimulacaoPublica>>('/catalogo/simulacoes?limit=4&sort=reputacao:desc'),
    retry: false,
  });

  const { data: instituicoes, isLoading: loadingInsts, isError: instError } = useQuery({
    queryKey: ['landing-destaques-insts'],
    queryFn: () => http.get<CatalogoResponse<InstituicaoPublica>>('/catalogo/instituicoes?limit=3&sort=reputacao:desc'),
    retry: false,
  });

  if (loadingSims || loadingInsts) {
    return (
      <section className="bg-background px-4 py-24 sm:px-6">
        <LandingDestaquesSkeleton />
      </section>
    );
  }

  // Regra zero mocks: se houver erro ou não houver dados em simulações, não renderiza nada
  if (simError || instError || !simulacoes?.data.length) {
    return null;
  }

  return (
    <section className="bg-background px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div {...fadeUp} className="mb-16">
          <h2 className="text-3xl font-bold text-text-primary sm:text-4xl font-display tracking-tight">
            {t('destaques.title')}
          </h2>
          <p className="mt-4 max-w-2xl text-text-secondary">
            {t('destaques.body')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-12">
          {/* Simulações Col (2/3) */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {simulacoes.data.map((sim: SimulacaoPublica, i: number) => {
                const colors = getPlaceholderColors(sim.area);
                return (
                  <motion.div
                    key={sim.id}
                    {...fadeUp}
                    transition={{ delay: i * 0.1 }}
                    className="group relative overflow-hidden rounded-3xl border border-white/5 bg-surface shadow-sm transition-all hover:border-accent/30 hover:shadow-2xl hover:shadow-accent/5"
                  >
                    <Link to={`/simulacoes/${sim.slug}`} className="block">
                      <div className="aspect-video w-full overflow-hidden">
                        {sim.capaUrl ? (
                          <img
                            src={sim.capaUrl}
                            alt={sim.titulo}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center"
                            style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
                          >
                            <Play className="h-12 w-12 text-white/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <span className="inline-block rounded-full bg-accent/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
                            {sim.area}
                          </span>
                          <h3 className="mt-3 text-lg font-bold text-white line-clamp-1 tracking-tight">{sim.titulo}</h3>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Instituições Col */}
          <div className="flex flex-col gap-6">
            <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
              <Building2 size={12} className="text-accent" /> {t('destaques.instituicoes_label')}
            </h3>
            <div className="flex flex-col gap-3">
              {instituicoes?.data.map((inst: InstituicaoPublica, i: number) => (
                <motion.div
                  key={inst.id}
                  {...fadeUp}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-accent/20 group"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-alt border border-white/5 overflow-hidden">
                    {inst.logoUrl ? (
                      <img src={inst.logoUrl} alt={inst.nome} className="h-full w-full object-contain p-2" />
                    ) : (
                      <Building2 className="h-6 w-6 text-text-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-text-primary truncate group-hover:text-accent transition-colors">{inst.nome}</h4>
                    <p className="text-[10px] text-text-muted uppercase font-medium tracking-wider">{inst.regiao || 'Angola'}</p>
                  </div>
                  <Link to={`/instituicoes/${inst.slug || inst.id}`} className="text-text-muted group-hover:text-accent transition-colors">
                    <ChevronRight size={18} />
                  </Link>
                </motion.div>
              ))}
            </div>
            <Link
              to="/explorar?tab=instituicoes"
              className="mt-2 text-xs font-bold uppercase tracking-widest text-accent/60 hover:text-accent transition-colors inline-flex items-center gap-1"
            >
              {t('destaques.ver_todas')} <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
