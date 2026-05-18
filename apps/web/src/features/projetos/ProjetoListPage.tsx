import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Avatar, EmptyState, Pagination } from '@/components/ui';
import { QuietHero } from '@/components/ui/quiet/QuietHero';
import { QuietCard } from '@/components/ui/quiet/QuietCard';
import { EditorialStateBadge } from '@/components/ui/EditorialStateBadge';
import { SEOHead } from '@/components/layout/SEOHead';
import { Plus, Search, Layers, ThumbsUp } from 'lucide-react';
import { projetosApi } from '@/lib/api/projetos';
import { motion } from 'motion/react';
import { APPLE_SPRING } from '@/lib/animations';
import type { Projeto, ProjetoModo } from '@pdc/shared';

const PAGE_SIZE = 12;

const MODO_LABELS: Record<ProjetoModo, string> = {
  exposicao: 'Exposição',
  colaboracao: 'Colaboração',
  mentoria: 'Mentoria',
  financiamento: 'Financiamento',
  feedbackComunitario: 'Feedback',
};

const FILTER_TABS: { label: string; modos?: ProjetoModo }[] = [
  { label: 'Todos' },
  { label: 'Colaboração', modos: 'colaboracao' },
  { label: 'Mentoria', modos: 'mentoria' },
  { label: 'Feedback', modos: 'feedbackComunitario' },
];

function ProjetoCard({ proj, index }: { proj: Projeto; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...APPLE_SPRING, delay: index * 0.03 }}
    >
      <Link to={`/app/projetos/${proj.id}`} className="block group">
        <QuietCard padding="sm" tone="elevated" className="h-full overflow-hidden flex flex-col hover:border-accent/20 transition-colors duration-300">
          <div className="aspect-[16/10] w-full bg-elevated overflow-hidden rounded-sm">
            {proj.capaUrl ? (
              <img
                src={proj.capaUrl}
                alt={proj.titulo}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Layers size={32} className="text-ink-tertiary/20" />
              </div>
            )}
          </div>

          <div className="p-4 flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar src={proj.autor?.foto?.url ?? undefined} fallback={proj.autor?.nome[0] ?? 'P'} className="h-6 w-6" />
                <span className="text-xs text-ink-tertiary">{proj.autor?.nome ?? 'Autor'}</span>
              </div>
              <EditorialStateBadge state={proj.estado} />
            </div>

            <h3 className="text-base font-semibold text-ink-primary group-hover:text-accent transition-colors duration-200 line-clamp-1">
              {proj.titulo}
            </h3>

            <p className="text-sm text-ink-secondary line-clamp-2 leading-relaxed">
              {proj.abstract}
            </p>

            <div className="mt-auto pt-3 flex items-center justify-between border-t border-border">
              <div className="flex flex-wrap gap-1.5">
                {proj.modos.slice(0, 2).map((m) => (
                  <span key={m} className="px-2 py-0.5 text-[10px] font-semibold text-ink-tertiary bg-elevated rounded-sm">
                    {MODO_LABELS[m]}
                  </span>
                ))}
                {proj.area && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold text-accent bg-accent/10 rounded-sm">
                    {proj.area}
                  </span>
                )}
              </div>
              {proj.selo && (
                <ThumbsUp size={14} className="text-success" />
              )}
            </div>
          </div>
        </QuietCard>
      </Link>
    </motion.div>
  );
}

export function ProjetoListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState(0);

  const activeFilter = FILTER_TABS[activeTab];

  const { data, isLoading, isError } = useQuery({
    queryKey: ['projetos', 'list', page, PAGE_SIZE, activeFilter?.modos],
    queryFn: () => projetosApi.list({
      page,
      pageSize: PAGE_SIZE,
      ...(activeFilter?.modos ? { modos: activeFilter.modos } : {}),
    }),
  });

  const allProjetos = data?.data ?? [];
  const pageCount = data?.pagination.pageCount ?? 1;
  const projetos = search
    ? allProjetos.filter(p => p.titulo.toLowerCase().includes(search.toLowerCase()))
    : allProjetos;

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6 lg:px-8">
      <SEOHead title="Projetos" description="Explora projetos criados pela comunidade PDC." />

      <div className="mx-auto max-w-7xl space-y-8">
        <QuietHero
          title="Projetos"
          description="Evidência real de competência. Explora, colabora e conecta-te com talento."
          serif={false}
          actions={
            <Link to="/app/projetos/novo">
              <Button variant="primary" className="rounded-sm">
                <Plus size={16} className="mr-2" /> Criar Projeto
              </Button>
            </Link>
          }
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" size={16} />
            <input
              type="text"
              placeholder="Pesquisar projetos..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-elevated border border-border rounded-sm text-sm text-ink-primary outline-none focus:border-accent transition-colors"
            />
          </div>

          <nav className="flex gap-1" role="tablist">
            {FILTER_TABS.map((tab, i) => (
              <button
                key={tab.label}
                role="tab"
                aria-selected={activeTab === i}
                onClick={() => { setActiveTab(i); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors ${
                  activeTab === i
                    ? 'bg-accent/10 text-accent'
                    : 'text-ink-tertiary hover:text-ink-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 bg-elevated/50 animate-pulse rounded-sm" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={Layers}
            variant="error"
            title="Erro ao carregar projetos"
            description="Não foi possível carregar os projetos. Tenta novamente."
            onRetry={() => { window.location.reload(); }}
          />
        ) : projetos.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={search ? 'Nenhum projeto encontrado' : 'Ainda sem projetos'}
            description={search ? `Sem resultados para "${search}".` : 'Sê o primeiro a criar um projeto e mostrar o teu trabalho.'}
            {...(search
              ? { ctaLabel: 'Limpar pesquisa', onRetry: () => { setSearch(''); } }
              : { ctaLabel: 'Criar Projeto', onRetry: () => { navigate('/app/projetos/novo'); } }
            )}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {projetos.map((p, i) => (
                <ProjetoCard key={p.id} proj={p} index={i} />
              ))}
            </div>
            {pageCount > 1 && !search && (
              <div className="pt-8 flex justify-center">
                <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
