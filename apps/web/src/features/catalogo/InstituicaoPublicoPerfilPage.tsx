import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Badge } from '@/components/ui';

export function InstituicaoPublicoPerfilPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: inst, isLoading, isError } = useQuery({
    queryKey: ['catalogo-instituicao', slug],
    queryFn: () => catalogoApi.getInstituicao(slug ?? ''),
    enabled: !!slug,
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><Spinner size="lg" /></div>;
  if (isError || !inst) return <div className="flex min-h-screen items-center justify-center bg-background"><p className="text-text-muted">Instituição não encontrada.</p></div>;

  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/instituicoes" className="text-sm text-text-muted hover:text-text-secondary">← Voltar às instituições</Link>

        <div className="mt-8 flex items-center gap-4">
          {inst.logoUrl ? (
            <img src={inst.logoUrl} alt={inst.nome} className="h-16 w-16 rounded-xl object-contain" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-amber/10 text-2xl text-amber">🏫</div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{inst.nome}</h1>
            <div className="mt-1 flex gap-2">
              {inst.tipo ? <Badge variant="info">{inst.tipo}</Badge> : null}
              {inst.regiao ? <Badge variant="outline">{inst.regiao}</Badge> : null}
            </div>
          </div>
        </div>

        {inst.descricao ? (
          <div className="mt-8 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-text-primary">Sobre</h2>
            <p className="mt-2 text-sm text-text-secondary">{inst.descricao}</p>
          </div>
        ) : null}

        <div className="mt-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">Programas e Cursos</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Esta instituição{inst.regiao ? ` na região de ${inst.regiao}` : ''} oferece cursos e experiências práticas.
          </p>
          <p className="mt-1 text-xs text-text-muted">Cria conta para ver o catálogo completo de programas.</p>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">Mentores Associados</h2>
          <p className="mt-2 text-sm text-text-muted">Inicia sessão para ver mentores desta instituição.</p>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link to="/login" className="rounded-xl bg-amber px-6 py-3 text-center text-sm font-semibold text-black transition-colors hover:bg-amber-hover">
            Entrar na plataforma
          </Link>
          <Link to="/instituicoes" className="rounded-xl border border-border px-6 py-3 text-center text-sm text-text-secondary transition-colors hover:bg-white/5">
            Ver mais instituições
          </Link>
        </div>
      </div>
    </div>
  );
}
