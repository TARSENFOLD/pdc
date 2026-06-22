import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';
import type { ReactNode } from 'react';
import { ComplianceGate } from '@/features/auth/ComplianceGate';
import { needsLegalCompliance } from '@/features/auth/complianceGatePolicy';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f59e0b] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user && needsLegalCompliance(user)) {
    return <ComplianceGate />;
  }

  return <>{children}</>;
}
