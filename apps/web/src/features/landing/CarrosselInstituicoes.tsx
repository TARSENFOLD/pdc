import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner } from '@/components/ui';

// ─── Component ────────────────────────────────────────────────────────────────

export function CarrosselInstituicoes() {
  const { data: res, isLoading, isError } = useQuery({
    queryKey: ['landing-carrossel-instituicoes'],
    queryFn: () => catalogoApi.getInstituicoes({ pageSize: 15 }),
    staleTime: 1000 * 60 * 30, // 30 min cache
  });

  const items = res?.data ?? [];

  // Regra zero mocks: sem dados reais, mostramos skeleton ou nada.
  if (isError || (items.length === 0 && !isLoading)) return null;

  return (
    <section className="py-12 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
            Instituições de Prestígio em Angola
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4 opacity-20">
            <Spinner size="sm" />
          </div>
        ) : (
          <div className="relative group">
            {/* Gradientes de Máscara para suavizar as bordas do carrossel */}
            <div className="absolute left-0 top-0 bottom-0 z-10 w-24 bg-gradient-to-r from-background to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 z-10 w-24 bg-gradient-to-l from-background to-transparent pointer-events-none" />

            {/* Marquee de Logos */}
            <div className="flex animate-marquee whitespace-nowrap gap-12 py-4">
              {[...items, ...items].map((inst, i) => (
                <Link
                  key={`${inst.id}-${String(i)}`}
                  to={`/instituicoes/${inst.slug || inst.id}`}
                  className="flex flex-none items-center gap-4 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                >
                  <div className="h-12 w-12 rounded-xl bg-surface-raised border border-border p-2 flex items-center justify-center shadow-sm">
                    {inst.logoUrl ? (
                      <img src={inst.logoUrl} alt={inst.nome} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-[10px] font-bold text-amber">{inst.nome.substring(0, 2)}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-text-primary tracking-tight">{inst.nome}</span>
                    <span className="text-[9px] uppercase font-bold text-amber/60">{inst.regiao}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
