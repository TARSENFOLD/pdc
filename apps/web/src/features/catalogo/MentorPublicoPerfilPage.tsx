import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Avatar, Button } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';
import { Zap, ShieldCheck, ArrowLeft } from 'lucide-react';
import { MentorPublico } from '@pdc/shared';

export function MentorPublicoPerfilPage() {
  const { id } = useParams<{ id: string }>();

  const { data: mentor, isLoading, isError } = useQuery<MentorPublico>({
    queryKey: ['catalogo-mentor', id],
    queryFn: () => catalogoApi.getMentor(id ?? ''),
    enabled: !!id,
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-canvas"><Spinner size="lg" /></div>;
  if (isError || !mentor) return <div className="flex min-h-screen items-center justify-center bg-canvas"><p className="text-ink-tertiary">Mentor não encontrado.</p></div>;

  return (
    <div className="min-h-screen bg-canvas px-4 py-16 sm:px-6">
      <SEOHead 
        title={mentor.nome}
        description={mentor.bio || `Mentor especializado em ${mentor.areaEspecialidade || 'diversas áreas'}`}
        image={mentor.avatarUrl || undefined}
        url={`https://usepdc.com/mentores/${id ?? ''}`}
        type="profile"
        jsonLd={{
          '@type': 'Person',
          name: mentor.nome,
          description: mentor.bio || '',
          jobTitle: mentor.areaEspecialidade || '',
        }}
      />
      <div className="mx-auto max-w-3xl">
        <Link to="/mentores" className="group flex items-center gap-2 text-sm text-ink-tertiary hover:text-ink-secondary mb-8 transition-all">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
          Voltar aos mentores
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            <Avatar size="xl" {...(mentor.avatarUrl ? { src: mentor.avatarUrl } : {})} alt={mentor.nome} fallback={mentor.nome.substring(0, 2)} className="border-4 border-accent/10" />
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-widest mb-2">
                 <ShieldCheck size={10} /> Mentor Verificado
              </div>
              <h1 className="text-3xl font-black text-ink-primary tracking-tighter font-display">{mentor.nome}</h1>
              {mentor.areaEspecialidade ? <p className="text-sm font-medium text-accent">{mentor.areaEspecialidade}</p> : null}
              <div className="mt-3">
                <Link to={`/perfil/${id}`} className="inline-flex items-center text-[11px] font-black uppercase tracking-wider text-ink-tertiary hover:text-accent hover:underline transition-all">
                  Ver Perfil Completo →
                </Link>
              </div>
            </div>
          </div>

          <Link to={`/login?redirect=/programas/shadow-a-pro?mentorId=${id ?? ''}`}>
            <Button className="h-14 px-8 rounded-lg bg-accent text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-xl shadow-accent/20">
              <Zap size={16} className="mr-2 fill-current" /> Shadow a Pro
            </Button>
          </Link>
        </div>

        {mentor.bio ? (
          <div className="mt-8 pt-8 border-t border-ink-tertiary/10">
            <h2 className="text-lg font-semibold text-ink-primary">Sobre</h2>
            <p className="mt-2 text-sm text-ink-secondary">{mentor.bio}</p>
          </div>
        ) : null}

        <div className="mt-6 pt-6 border-t border-ink-tertiary/10">
          <h2 className="text-lg font-semibold text-ink-primary">Cursos e Especialização</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            {mentor.areaEspecialidade ? `Especialista em ${mentor.areaEspecialidade}.` : 'Mentor da plataforma PDC.'}
          </p>
          <p className="mt-1 text-xs text-ink-tertiary">Cria conta para ver os cursos que este mentor lecciona.</p>
        </div>

        <div className="mt-6 pt-6 border-t border-ink-tertiary/10">
          <h2 className="text-lg font-semibold text-ink-primary">Avaliações</h2>
          <p className="mt-2 text-sm text-ink-tertiary">Inicia sessão para ver as avaliações de outros estudantes.</p>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link to="/login" className="rounded-lg bg-accent px-6 py-3 text-center text-sm font-semibold text-black transition-colors hover:bg-accent-terracotta-soft">
            Conectar com este mentor
          </Link>
          <Link to="/mentores" className="rounded-lg border border-transparent px-6 py-3 text-center text-sm text-ink-secondary transition-colors hover:border-ink-tertiary/20 hover:bg-recessed">
            Ver mais mentores
          </Link>
        </div>
      </div>
    </div>
  );
}
