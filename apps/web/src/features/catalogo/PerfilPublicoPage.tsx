import { useQuery } from '@tanstack/react-query';
import { Award, Lock, Globe, ExternalLink, User } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Avatar, Badge } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';
import { EmptyState } from '@/components/ui/EmptyState';

interface PublicPerfil {
  id: string;
  nome: string;
  avatarUrl?: string;
  bio?: string;
  role: string;
  headline?: string;
  website?: string;
  socialLinks?: { linkedin?: string; github?: string; [key: string]: string | undefined };
  areasInteresse?: string[];
  competencias?: string[];
}

export function PerfilPublicoPage() {
  const { id } = useParams<{ id: string }>();

  const { data: perfil, isLoading, isError } = useQuery({
    queryKey: ['perfil-publico', id],
    queryFn: () => catalogoApi.getPerfilPublico(id ?? '') as Promise<PublicPerfil>,
    enabled: !!id,
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><Spinner size="lg" /></div>;
  if (isError || !perfil) return <div className="flex min-h-screen items-center justify-center bg-background p-4"><EmptyState icon={User} title="Perfil não encontrado" description="Não foi possível carregar os dados deste perfil." /></div>;

  const roleBadge: Record<string, string> = {
    aluno: 'aluno', mentor: 'mentor', instituicao: 'instituicao',
    moderador: 'moderador', comite_cientifico: 'admin', super_admin: 'admin',
  };

  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <SEOHead
        title={perfil.nome}
        description={perfil.bio ?? `Perfil de ${perfil.nome} na plataforma PDC`}
        image={perfil.avatarUrl}
        url={`https://usepdc.com/perfis/${id ?? ''}`}
        type="profile"
      />
      <div className="mx-auto max-w-3xl">
        <Link to="/explorar" className="text-sm text-text-muted hover:text-text-secondary">← Voltar</Link>

        <div className="mt-8 flex items-center gap-6">
          <Avatar size="xl" {...(perfil.avatarUrl ? { src: perfil.avatarUrl } : {})} alt={perfil.nome} fallback={perfil.nome.substring(0, 2)} />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{perfil.nome}</h1>
            {perfil.headline && <p className="mt-1 text-sm text-text-secondary">{perfil.headline}</p>}
            <Badge variant={(roleBadge[perfil.role] ?? 'default') as 'aluno'}>{perfil.role}</Badge>
          </div>
        </div>

        {perfil.bio ? (
          <div className="mt-8 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-text-primary">Bio</h2>
            <p className="mt-2 text-sm text-text-secondary">{perfil.bio}</p>
          </div>
        ) : null}

        {(perfil.website || perfil.socialLinks) && (
          <div className="mt-6 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-text-primary">Links</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {perfil.website && (
                <a href={perfil.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised px-3 py-1 text-xs text-text-secondary hover:text-accent">
                  <Globe size={14} /> Website <ExternalLink size={10} />
                </a>
              )}
              {perfil.socialLinks?.linkedin && (
                <a href={perfil.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised px-3 py-1 text-xs text-text-secondary hover:text-accent">
                  LinkedIn <ExternalLink size={10} />
                </a>
              )}
              {perfil.socialLinks?.github && (
                <a href={perfil.socialLinks.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised px-3 py-1 text-xs text-text-secondary hover:text-accent">
                  GitHub <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>
        )}

        {perfil.areasInteresse && perfil.areasInteresse.length > 0 && (
          <div className="mt-6 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-text-primary">Áreas de Interesse</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {perfil.areasInteresse.map((area) => (
                <span key={area} className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">{area}</span>
              ))}
            </div>
          </div>
        )}

        {perfil.competencias && perfil.competencias.length > 0 && (
          <div className="mt-6 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-text-primary">Competências</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {perfil.competencias.map((comp) => (
                <span key={comp} className="rounded-full bg-surface-raised px-3 py-1 text-xs text-text-secondary">{comp}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">Conquistas</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-amber/10 px-3 py-1 text-xs text-amber"><Award size={14} aria-hidden={true} className="inline-block mr-1" /> Perfil completo</span>
            <span className="rounded-full bg-surface-raised px-3 py-1 text-xs text-text-muted"><Lock size={14} aria-hidden={true} className="inline-block mr-1" /> Mais conquistas visíveis após registo</span>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">Projectos Públicos</h2>
          <p className="mt-2 text-sm text-text-muted">Cria conta para ver os projectos deste utilizador.</p>
        </div>

        <div className="mt-8">
          <Link to="/criar-conta" className="text-sm text-amber hover:underline">
            Criar conta gratuita →
          </Link>
        </div>
      </div>
    </div>
  );
}
