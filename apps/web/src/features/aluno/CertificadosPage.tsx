import { useQuery } from '@tanstack/react-query';
import { cursosApi } from '@/lib/api/cursos';
import { Spinner, Badge } from '@/components/ui';
import { GraduationCap } from 'lucide-react';
import type { InscricaoComCurso } from '@pdc/shared';

export function CertificadosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['estudante', 'certificados'],
    queryFn: () => cursosApi.getCertificados(),
  });

  const certificados = data?.data ?? [];

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-primary font-sora">Certificados</h1>
      {certificados.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
          <GraduationCap size={40} aria-hidden={true} className="mb-4 text-amber mx-auto" />
          <p className="text-text-secondary">Ainda não tens certificados.</p>
          <p className="mt-1 text-xs text-text-muted">Conclui um curso para receberes o teu primeiro certificado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {certificados.map((cert: InscricaoComCurso) => (
            <div
              key={cert.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface-raised p-4"
            >
              <div>
                <p className="text-sm font-medium text-text-primary">{cert.curso?.titulo ?? 'Curso'}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Concluído em {new Date(cert.dataConclusao ?? cert.dataInscricao).toLocaleDateString('pt-AO')}
                </p>
              </div>
              <Badge variant="success">Certificado</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
