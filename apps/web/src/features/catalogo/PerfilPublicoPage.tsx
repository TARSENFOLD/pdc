import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Avatar, Badge } from '@/components/ui';

export function PerfilPublicoPage() {
  const { id } = useParams<{ id: string }>();

  const { data: perfil, isLoading, isError } = useQuery({
    queryKey: ['perfil-publico', id],
    queryFn: () => catalogoApi.getPerfilPublico(id ?? ''),
    enabled: !!id,
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><Spinner size="lg" /></div>;
  if (isError || !perfil) return <div className="flex min-h-screen items-center justify-center bg-background"><p className="text-text-muted">Perfil não encontrado.</p></div>;

  const roleBadge: Record<string, string> = {
    aluno: 'aluno', mentor: 'mentor', instituicao: 'instituicao',
    moderador: 'moderador', comite_cientifico: 'admin', super_admin: 'admin',
  };

  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/explorar" className="text-sm text-text-muted hover:text-text-secondary">← Voltar</Link>

        <div className="mt-8 flex items-center gap-6">
          <Avatar size="xl" {...(perfil.avatarUrl ? { src: perfil.avatarUrl } : {})} alt={perfil.nome} fallback={perfil.nome.substring(0, 2)} />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{perfil.nome}</h1>
            <Badge variant={(roleBadge[perfil.role] ?? 'default') as 'aluno'}>{perfil.role}</Badge>
          </div>
        </div>

        {perfil.bio ? (
          <div className="mt-8 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-text-primary">Bio</h2>
            <p className="mt-2 text-sm text-text-secondary">{perfil.bio}</p>
          </div>
        ) : null}

        <div className="mt-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">Conquistas</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-amber/10 px-3 py-1 text-xs text-amber">🏅 Perfil completo</span>
            <span className="rounded-full bg-surface-raised px-3 py-1 text-xs text-text-muted">🔒 Mais conquistas visíveis após registo</span>
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
