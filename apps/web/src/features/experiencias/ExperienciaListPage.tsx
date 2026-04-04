import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { experienciasApi } from '@/lib/api/experiencias';
import { Spinner, Card, Pagination, Badge } from '@/components/ui';
import type { Experiencia } from '@pdc/shared';

function ExperienciaCard({ exp }: { exp: Experiencia }) {
  const inicio = new Date(exp.dataInicio).toLocaleDateString('pt-AO');
  return (
    <Link to={`/experiencias/${exp.id}`}>
      <Card interactive className="p-5">
        {exp.capaUrl ? (
          <img src={exp.capaUrl} alt={exp.titulo} className="mb-4 h-32 w-full rounded-lg object-cover" />
        ) : null}
        <h3 className="font-semibold text-text-primary line-clamp-1">{exp.titulo}</h3>
        <p className="mt-1 text-xs text-text-muted line-clamp-2">{exp.descricao}</p>
        <p className="mt-3 text-xs text-amber">{inicio}</p>
      </Card>
    </Link>
  );
}

export function ExperienciaListPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['experiencias', page],
    queryFn: () => experienciasApi.list({ page, pageSize: 12 }),
  });

  const experiencias = data?.data ?? [];
  const pageCount = data?.pagination.pageCount ?? 1;

  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <Badge variant="info" className="mb-4">Plataforma PDC</Badge>
          <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Experiências</h1>
          <p className="mt-2 text-text-muted">
            Oportunidades de estágio e programas oferecidos por instituições parceiras.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <p className="py-12 text-center text-text-muted">Erro ao carregar experiências.</p>
        ) : experiencias.length === 0 ? (
          <p className="py-12 text-center text-text-muted">Nenhuma experiência disponível de momento.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {experiencias.map((exp) => (
                <ExperienciaCard key={exp.id} exp={exp} />
              ))}
            </div>
            {pageCount > 1 && (
              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} className="mt-10" />
            )}
          </>
        )}

        <div className="mt-16 flex items-center justify-center gap-4 text-sm text-text-muted">
          <Link to="/login" className="text-amber hover:underline">Entrar</Link>
          <span>·</span>
          <Link to="/register" className="text-amber hover:underline">Criar conta</Link>
        </div>
      </div>
    </div>
  );
}
