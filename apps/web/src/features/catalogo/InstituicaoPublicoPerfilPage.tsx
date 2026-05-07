import { useQuery } from '@tanstack/react-query';
import { Building2, ArrowLeft, Calendar, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Badge, Button } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';
import type { InstituicaoPublica } from '@pdc/shared';

export function InstituicaoPublicoPerfilPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: inst, isLoading, isError } = useQuery<InstituicaoPublica | null>({
    queryKey: ['catalogo-instituicao', slug],
    queryFn: async () => {
      if (!slug) return null;
      return catalogoApi.getInstituicao(slug);
    },
    enabled: !!slug,
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-canvas"><Spinner size="lg" /></div>;
  if (isError || !inst) return <div className="flex min-h-screen items-center justify-center bg-canvas"><p className="text-ink-tertiary">Instituição não encontrada.</p></div>;

  return (
    <div className="min-h-screen bg-canvas px-4 py-16 sm:px-6">
      <SEOHead
        title={inst.nome}
        description={inst.bio || `Instituição de ensino${inst.regiao ? ` na região de ${inst.regiao}` : ''}`}
        image={inst.logoUrl || undefined}
        url={`https://usepdc.com/instituicoes/${slug || ''}`}
        type="profile"
        jsonLd={{
          '@type': 'EducationalOrganization',
          name: inst.nome,
          description: inst.bio || '',
          url: `https://usepdc.com/instituicoes/${slug || ''}`,
        }}
      />
      <div className="mx-auto max-w-3xl">
        <Link to="/instituicoes" className="group flex items-center gap-2 text-sm text-ink-tertiary hover:text-ink-secondary mb-8 transition-all">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Voltar às instituições
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            {inst.logoUrl ? (
              <img src={inst.logoUrl} alt={inst.nome} className="h-20 w-20 rounded-lg object-contain border border-ink-tertiary/10 p-2 bg-white" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-accent/5 text-accent border border-accent/10"><Building2 size={40} /></div>
            )}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-widest mb-2">
                 <ShieldCheck size={10} /> Instituição Validada
              </div>
              <h1 className="text-3xl font-black text-ink-primary tracking-tighter font-display">{inst.nome}</h1>
              <div className="mt-1 flex gap-2">
                {inst.tipo ? <Badge variant="secondary" className="bg-recessed text-[9px] uppercase font-black">{inst.tipo}</Badge> : null}
                {inst.regiao ? <Badge variant="secondary" className="bg-recessed text-[9px] uppercase font-black">{inst.regiao}</Badge> : null}
              </div>
              <div className="mt-3">
                {slug ? (
                  <Link to={`/perfil/${slug}`} className="inline-flex items-center text-[11px] font-black uppercase tracking-wider text-ink-tertiary hover:text-accent hover:underline transition-all">
                    Ver Perfil Completo →
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <Link to={`/login?redirect=/programas/edu-visita?instituicaoId=${inst.id}`}>
            <Button className="h-14 px-8 rounded-lg bg-accent text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-xl shadow-accent/20">
              <Calendar size={16} className="mr-2" /> Agendar EduVisita
            </Button>
          </Link>
        </div>

        {inst.descricao ? (
          <div className="mt-8 pt-8 border-t border-ink-tertiary/10">
            <h2 className="text-lg font-semibold text-ink-primary">Sobre</h2>
            <p className="mt-2 text-sm text-ink-secondary">{inst.descricao}</p>
          </div>
        ) : null}

        <div className="mt-8 pt-8 border-t border-ink-tertiary/10">
          <h2 className="text-lg font-semibold text-ink-primary">Programas e Cursos</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            Esta instituição{inst.regiao ? ` na região de ${inst.regiao}` : ''} oferece cursos e experiências práticas.
          </p>
          <p className="mt-1 text-xs text-ink-tertiary">Cria conta para ver o catálogo completo de programas.</p>
        </div>

        <div className="mt-6 pt-6 border-t border-ink-tertiary/10">
          <h2 className="text-lg font-semibold text-ink-primary">Mentores Associados</h2>
          <p className="mt-2 text-sm text-ink-tertiary">Inicia sessão para ver mentores desta instituição.</p>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link to="/login" className="rounded-lg bg-accent px-6 py-3 text-center text-sm font-semibold text-ink-on-accent transition-colors hover:bg-accent-terracotta-soft">
            Entrar na plataforma
          </Link>
          <Link to="/instituicoes" className="rounded-lg border border-transparent px-6 py-3 text-center text-sm text-ink-secondary transition-colors hover:border-ink-tertiary/20 hover:bg-recessed">
            Ver mais instituições
          </Link>
        </div>
      </div>
    </div>
  );
}
