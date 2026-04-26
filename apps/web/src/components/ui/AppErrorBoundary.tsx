import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { EmptyState } from './EmptyState';
import { AlertTriangle } from 'lucide-react';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorMessage = error instanceof Error ? error.message : 'O Oráculo encontrou uma instabilidade inesperada.';
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <EmptyState
        icon={AlertTriangle}
        variant="error"
        title="Ocorreu um erro sistémico"
        description={errorMessage}
        onRetry={resetErrorBoundary}
      />
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}
