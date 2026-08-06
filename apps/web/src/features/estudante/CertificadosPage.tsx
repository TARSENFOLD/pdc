import { Spinner, EmptyState } from '@/components/ui';
import { Award } from 'lucide-react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

export function CertificadosPage() {
  const { isEnabled, isLoading: flagsLoading } = useFeatureFlags();
  const certificatesEnabled = isEnabled('certificates_enabled');

  if (flagsLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  if (!certificatesEnabled) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-6">
        <EmptyState
          icon={Award}
          title="Certificados temporariamente indisponíveis"
          description="Esta área ainda não está disponível."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-6">
      <EmptyState
        icon={Award}
        title="Ainda não existem certificados disponíveis"
        description="Os certificados emitidos aparecerão aqui quando existir um registo verificável disponível."
      />
    </div>
  );
}
