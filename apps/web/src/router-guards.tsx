import React from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '@pdc/shared';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { DASHBOARD_BY_ROLE } from '@/components/layout/Sidebar.config';

export function DashboardRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <Navigate to={DASHBOARD_BY_ROLE[user.role]} replace />;
}

export function RoleGuard({ allowed, children }: { allowed: Role[]; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;
  if (!user || !allowed.includes(user.role)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
