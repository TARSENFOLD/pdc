import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '@/lib/api/http';
import { legalApi } from '@/lib/api/legal';
import { Spinner } from '@/components/ui';

function errorText(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return 'Documento legal não encontrado.';
  return 'Não foi possível carregar este documento legal.';
}

export function LegalDocPage(): React.JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const normalizedSlug = slug ?? '';
  const query = useQuery({
    queryKey: ['legal-doc', normalizedSlug],
    queryFn: () => legalApi.getBySlug(normalizedSlug),
    enabled: normalizedSlug.length > 0,
  });

  if (query.isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (query.isError || !query.data) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-accent">Documento legal</h1>
        <p className="mt-4 text-sm text-ink-secondary">{errorText(query.error)}</p>
        <Link className="mt-6 inline-block text-sm font-bold text-accent hover:underline" to="/">
          Voltar ao início
        </Link>
      </main>
    );
  }

  const document = query.data;
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 border-b border-white/10 pb-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">{document.tipo}</p>
        <h1 className="text-3xl font-bold text-ink-primary">{document.titulo}</h1>
        <p className="mt-3 text-sm text-ink-secondary">Versão {document.versao}</p>
        {document.resumo && <p className="mt-4 text-sm leading-relaxed text-ink-secondary">{document.resumo}</p>}
      </header>
      <article className="whitespace-pre-wrap text-sm leading-7 text-ink-secondary">
        {document.conteudo}
      </article>
    </main>
  );
}
