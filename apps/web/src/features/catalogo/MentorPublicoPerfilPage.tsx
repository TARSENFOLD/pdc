import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Avatar } from '@/components/ui';

export function MentorPublicoPerfilPage() {
  const { id } = useParams<{ id: string }>();

  const { data: mentor, isLoading, isError } = useQuery({
    queryKey: ['catalogo-mentor', id],
    queryFn: () => catalogoApi.getMentor(id ?? ''),
    enabled: !!id,
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><Spinner size="lg" /></div>;
  if (isError || !mentor) return <div className="flex min-h-screen items-center justify-center bg-background"><p className="text-text-muted">Mentor não encontrado.</p></div>;

  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/mentores" className="text-sm text-text-muted hover:text-text-secondary">← Voltar aos mentores</Link>

        <div className="mt-8 flex items-center gap-6">
          <Avatar size="xl" {...(mentor.avatarUrl ? { src: mentor.avatarUrl } : {})} alt={mentor.nome} fallback={mentor.nome.substring(0, 2)} />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{mentor.nome}</h1>
            {mentor.areaEspecialidade ? <p className="text-sm text-amber">{mentor.areaEspecialidade}</p> : null}
          </div>
        </div>

        {mentor.bio ? (
          <div className="mt-8 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-text-primary">Sobre</h2>
            <p className="mt-2 text-sm text-text-secondary">{mentor.bio}</p>
          </div>
        ) : null}

        <div className="mt-6 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">Cursos e Especialização</h2>
          <p className="mt-2 text-sm text-text-secondary">
            {mentor.areaEspecialidade ? `Especialista em ${mentor.areaEspecialidade}.` : 'Mentor da plataforma PDC.'}
          </p>
          <p className="mt-1 text-xs text-text-muted">Cria conta para ver os cursos que este mentor lecciona.</p>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">Avaliações</h2>
          <p className="mt-2 text-sm text-text-muted">Inicia sessão para ver as avaliações de outros estudantes.</p>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link to="/login" className="rounded-xl bg-amber px-6 py-3 text-center text-sm font-semibold text-black transition-colors hover:bg-amber-hover">
            Conectar com este mentor
          </Link>
          <Link to="/mentores" className="rounded-xl border border-border px-6 py-3 text-center text-sm text-text-secondary transition-colors hover:bg-white/5">
            Ver mais mentores
          </Link>
        </div>
      </div>
    </div>
  );
}
