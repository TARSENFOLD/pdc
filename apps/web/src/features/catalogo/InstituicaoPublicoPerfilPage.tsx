import { useQuery } from '@tanstack/react-query';
import { Building2, ArrowLeft, Calendar, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Badge, Button } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';

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
      <SEOHead
        title={inst.nome}
        description={inst.descricao ?? `Instituição de ensino${inst.regiao ? ` na região de ${inst.regiao}` : ''}`}
        image={inst.logoUrl}
        url={`https://usepdc.com/instituicoes/${slug ?? ''}`}
        type="profile"
        jsonLd={{
          '@type': 'EducationalOrganization',
          name: inst.nome,
          description: inst.descricao,
          url: `https://usepdc.com/instituicoes/${slug ?? ''}`,
        }}
      />
      <div className="mx-auto max-w-3xl">
        <Link to="/instituicoes" className="group flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary mb-8 transition-all">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Voltar às instituições
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            {inst.logoUrl ? (
              <img src={inst.logoUrl} alt={inst.nome} className="h-20 w-20 rounded-2xl object-contain border border-border p-2 bg-white" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/5 text-accent border border-accent/10"><Building2 size={40} /></div>
            )}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-widest mb-2">
                 <ShieldCheck size={10} /> Instituição Validada
              </div>
              <h1 className="text-3xl font-black text-text-primary tracking-tighter font-display">{inst.nome}</h1>
              <div className="mt-1 flex gap-2">
                {inst.tipo ? <Badge variant="secondary" className="bg-surface-alt text-[9px] uppercase font-black">{inst.tipo}</Badge> : null}
                {inst.regiao ? <Badge variant="secondary" className="bg-surface-alt text-[9px] uppercase font-black">{inst.regiao}</Badge> : null}
              </div>
            </div>
          </div>

          <Link to={`/login?redirect=/programas/edu-visita?instituicaoId=${inst.id}`}>
            <Button className="h-14 px-8 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-xl shadow-accent/20">
              <Calendar size={16} className="mr-2" /> Agendar EduVisita
            </Button>
          </Link>
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
          <Link to="/instituicoes" className="rounded-xl border border-border px-6 py-3 text-center text-sm text-text-secondary transition-colors hover:bg-surface-raised">
            Ver mais instituições
          </Link>
        </div>
      </div>
    </div>
  );
}
