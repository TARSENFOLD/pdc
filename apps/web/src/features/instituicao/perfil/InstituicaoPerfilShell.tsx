import { AlertTriangle, Building2, ChevronRight } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  institutionKeys,
  instituicoesApi,
  isInstituicaoAssociacaoAusente,
} from '@/lib/api/instituicoes';
import { EmptyState, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';

const steps = [
  ['visao-geral', 'Visão geral'],
  ['identidade', 'Identidade'],
  ['localizacao-contactos', 'Localização e contactos'],
  ['oferta', 'Oferta e serviços'],
  ['recursos', 'Infraestrutura e dimensão'],
  ['qualidade', 'Qualidade e políticas'],
  ['multimedia', 'Multimédia'],
  ['documentos', 'Documentos e verificação'],
  ['preview', 'Pré-visualização pública'],
] as const;

export function InstituicaoPerfilShell() {
  const query = useQuery({
    queryKey: institutionKeys.me(),
    queryFn: instituicoesApi.getMe,
    retry: (failureCount, error) => (
      !isInstituicaoAssociacaoAusente(error) && failureCount < 2
    ),
  });
  if (query.isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  if (query.isError || !query.data) {
    const associationMissing = isInstituicaoAssociacaoAusente(query.error);
    return (
      <div className="mx-auto max-w-3xl py-10">
        <EmptyState
          icon={associationMissing ? AlertTriangle : Building2}
          variant="error"
          title={associationMissing ? 'Associação institucional pendente' : 'Perfil institucional indisponível'}
          description={associationMissing
            ? 'A conta existe, mas ainda não está ligada ao registo da instituição. Contacta um Super Admin e indica o email desta conta para concluir a reparação.'
            : 'Não foi possível carregar o perfil institucional. Tenta novamente; se o problema continuar, contacta o suporte.'}
          ctaLabel="Contactar suporte"
          ctaTo="/app/ajuda"
          onRetry={() => { void query.refetch(); }}
        />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-xl border border-[var(--card-border)] bg-canvas p-5">
        <div className="flex items-center gap-3">
          <Building2 className="text-accent" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-ink-primary">{query.data.identidade.nome}</h1>
            <p className="text-sm text-ink-secondary">Perfil institucional · {query.data.estado.replaceAll('_', ' ')}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-ink-primary">{query.data.completude}%</p>
            <p className="text-xs text-ink-tertiary">completo</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-recessed">
          <div className="h-full bg-accent transition-all" style={{ width: `${String(query.data.completude)}%` }} />
        </div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="space-y-1" aria-label="Etapas do perfil institucional">
          {steps.map(([slug, label]) => (
            <NavLink key={slug} to={slug} className={({ isActive }) => cn(
              'flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium',
              isActive ? 'bg-accent/10 text-accent' : 'text-ink-secondary hover:bg-recessed',
            )}>
              <ChevronRight size={15} /> {label}
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0"><Outlet context={{ instituicao: query.data }} /></main>
      </div>
    </div>
  );
}
