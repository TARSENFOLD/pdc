import { useQuery } from '@tanstack/react-query';
import { cursosApi } from '@/lib/api/cursos';
import { Spinner, Badge } from '@/components/ui';
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
      <h1 className="mb-6 text-2xl font-bold text-white font-sora">Certificados</h1>
      {certificados.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/3 p-8 text-center">
          <p className="text-4xl mb-4 text-white">🎓</p>
          <p className="text-white/50">Ainda não tens certificados.</p>
          <p className="mt-1 text-xs text-white/30">Conclui um curso para receberes o teu primeiro certificado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {certificados.map((cert: InscricaoComCurso) => (
            <div
              key={cert.id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/3 p-4"
            >
              <div>
                <p className="text-sm font-medium text-white">{cert.curso?.titulo ?? 'Curso'}</p>
                <p className="mt-0.5 text-xs text-white/40">
                  Concluído em {new Date(cert.dataConclusao ?? cert.dataInscricao).toLocaleDateString('pt-AO')}
                </p>
              </div>
              <Badge variant="success">🎓 Certificado</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
