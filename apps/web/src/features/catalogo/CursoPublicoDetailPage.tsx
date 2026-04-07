import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Badge } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';

export function CursoPublicoDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: curso, isLoading, isError } = useQuery({
    queryKey: ['catalogo-curso', slug],
    queryFn: () => catalogoApi.getCurso(slug ?? ''),
    enabled: !!slug,
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><Spinner size="lg" /></div>;
  if (isError || !curso) return <div className="flex min-h-screen items-center justify-center bg-background"><p className="text-text-muted">Curso não encontrado.</p></div>;

  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <SEOHead 
        title={curso.titulo}
        description={curso.descricao}
        image={curso.capaUrl}
        url={`https://usepdc.com/cursos/${slug}`}
        type="course"
        jsonLd={{
          '@type': 'Course',
          name: curso.titulo,
          description: curso.descricao,
          provider: { '@type': 'Organization', name: 'PDC — Por Dentro do Curso' },
        }}
      />
      <div className="mx-auto max-w-3xl">
        <Link to="/cursos" className="text-sm text-text-muted hover:text-text-secondary">← Voltar aos cursos</Link>

        {curso.capaUrl ? <img src={curso.capaUrl} alt={curso.titulo} className="mt-6 w-full rounded-2xl object-cover" /> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {curso.area ? <Badge variant="info">{curso.area}</Badge> : null}
          {curso.nivel ? <Badge variant="outline">{curso.nivel}</Badge> : null}
          {curso.gratuito ? <Badge variant="success">Gratuito</Badge> : null}
        </div>

        <h1 className="mt-4 text-3xl font-bold text-text-primary">{curso.titulo}</h1>
        <p className="mt-2 text-text-secondary">{curso.descricao}</p>

        <div className="mt-4 flex items-center gap-4 text-sm text-text-muted">
          <span>{curso.totalHoras}h de conteúdo</span>
          {curso.autorNome ? <span>Por {curso.autorNome}</span> : null}
        </div>

        <div className="mt-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">Conteúdo do curso</h2>
          <p className="mt-3 text-sm text-text-secondary">
            {curso.totalHoras ? `${String(curso.totalHoras)} horas de conteúdo estruturado.` : 'Conteúdo estruturado em módulos.'}
          </p>
          <p className="mt-2 text-xs text-text-muted">Inscreve-te para aceder ao programa completo.</p>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link to="/login" className="rounded-xl bg-amber px-6 py-3 text-center text-sm font-semibold text-black transition-colors hover:bg-amber-hover">
            Inscrever-me neste curso
          </Link>
          <Link to="/cursos" className="rounded-xl border border-border px-6 py-3 text-center text-sm text-text-secondary transition-colors hover:bg-surface-raised">
            Ver mais cursos
          </Link>
        </div>
      </div>
    </div>
  );
}
