import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/lib/auth/auth-context';
import { DashboardRedirect } from '@/router-guards';
import { DASHBOARD_BY_ROLE } from '@/components/layout/Sidebar.config';
import type { User } from '@pdc/shared';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function user(role: User['role']): User {
  return {
    id: `user-${role}`,
    email: `${role}@pdc.ao`,
    nome: 'Utilizador PDC',
    role,
    areasInteresse: [],
    conquistas: [],
    xp: 0,
    reputacao: 0,
    reputacaoTier: 'BRONZE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function renderRedirect(authUser: User | null) {
  render(
    <AuthContext.Provider
      value={{
        user: authUser,
        isLoading: false,
        isAuthenticated: authUser !== null,
        login: vi.fn(),
        completeOtp: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={['/app']}>
        <DashboardRedirect />
        <LocationProbe />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('DashboardRedirect', () => {
  const roles: User['role'][] = ['estudante', 'mentor', 'instituicao', 'comite_cientifico', 'moderador', 'super_admin', 'patrocinador'];
  it.each(roles)('envia %s recém-autenticado direto para o dashboard por role', (role) => {
    renderRedirect(user(role));
    expect(screen.getByTestId('location').textContent).toBe(DASHBOARD_BY_ROLE[role]);
  });
});