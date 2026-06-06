import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '@pdc/shared';
import PerfilPage from './PerfilPage';

const authState = vi.hoisted(() => ({ user: null as User | null }));

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: authState.user, isLoading: false }),
}));

vi.mock('./PerfilShowcase', () => ({
  default: () => <div>Perfil comunitário</div>,
}));

function internalUser(role: User['role']): User {
  return {
    id: 'user-1',
    email: 'operador@pdc.ao',
    nome: 'Operador PDC',
    role,
    reputacaoTier: 'BRONZE',
    xp: 0,
    reputacao: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    areasInteresse: [],
    conquistas: [],
  };
}

describe('PerfilPage', () => {
  it.each([
    ['moderador', 'Moderador'],
    ['comite_cientifico', 'Comité Científico'],
  ] as const)('mostra o perfil interno mínimo para %s', (role, label) => {
    authState.user = internalUser(role);

    render(<MemoryRouter><PerfilPage /></MemoryRouter>);

    expect(screen.getByText('Operador PDC')).toBeDefined();
    expect(screen.getByText(label)).toBeDefined();
    expect(screen.getByText('Perfil interno mínimo')).toBeDefined();
  });

  it('mantém a conta super admin privada', () => {
    authState.user = internalUser('super_admin');

    render(<MemoryRouter><PerfilPage /></MemoryRouter>);

    expect(screen.getByText('Conta operacional privada')).toBeDefined();
    expect(screen.getByText('Esta conta não possui perfil público.')).toBeDefined();
  });

  it('mantém o perfil comunitário para os restantes papéis', () => {
    authState.user = internalUser('estudante');

    render(<MemoryRouter><PerfilPage /></MemoryRouter>);

    expect(screen.getByText('Perfil comunitário')).toBeDefined();
  });
});
