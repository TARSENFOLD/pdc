import type { ReactNode } from 'react';
import type { FeatureKey } from '@pdc/shared';
import { ShieldAlert } from 'lucide-react';
import { EmptyState, Spinner } from '@/components/ui';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useAuth } from '@/lib/auth/auth-context';

interface ProtectedFeatureBoundaryProps {
  children: ReactNode;
  flag: FeatureKey;
  title: string;
  description: string;
  allowInternalQa?: boolean;
}

export function ProtectedFeatureBoundary({
  children,
  flag,
  title,
  description,
  allowInternalQa = false,
}: ProtectedFeatureBoundaryProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { isEnabled, isLoading: flagsLoading } = useFeatureFlags();

  if (authLoading || flagsLoading) {
    return <div className="flex min-h-80 items-center justify-center"><Spinner size="lg" /></div>;
  }

  if ((allowInternalQa && user?.role === 'super_admin') || isEnabled(flag)) {
    return children;
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-6">
      <EmptyState icon={ShieldAlert} title={title} description={description} />
    </div>
  );
}

export function CreatorStudioBoundary({ children }: { children: ReactNode }) {
  return (
    <ProtectedFeatureBoundary
      flag="external_creator_onboarding_enabled"
      title="Estúdio temporariamente indisponível"
      description="O acesso de criação está temporariamente limitado às contas internas de QA."
      allowInternalQa
    >
      {children}
    </ProtectedFeatureBoundary>
  );
}

export function ProjectPublicationBoundary({ children }: { children: ReactNode }) {
  return (
    <ProtectedFeatureBoundary
      flag="external_project_publication_enabled"
      title="Publicação de projectos temporariamente indisponível"
      description="A criação e edição externa de projectos está temporariamente indisponível."
      allowInternalQa
    >
      {children}
    </ProtectedFeatureBoundary>
  );
}

export function ExternalCreatorSignupBoundary({ children }: { children: ReactNode }) {
  const { isEnabled, isLoading } = useFeatureFlags();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>;
  }
  if (isEnabled('external_creator_onboarding_enabled')) return children;

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <EmptyState
        icon={ShieldAlert}
        title="Registo de criadores temporariamente indisponível"
        description="O registo de Mentor e Instituição está temporariamente fechado. O acesso de Estudante continua disponível."
        ctaLabel="Criar conta de Estudante"
        ctaTo="/criar-conta/estudante"
      />
    </main>
  );
}
