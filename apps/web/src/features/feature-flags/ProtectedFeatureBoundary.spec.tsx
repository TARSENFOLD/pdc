import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CreatorStudioBoundary,
  ExternalCreatorSignupBoundary,
} from './ProtectedFeatureBoundary';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useAuth } from '@/lib/auth/auth-context';
import type { User } from '@pdc/shared';

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlags: vi.fn(),
}));

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

describe('COR-0001 frontend boundaries', () => {
  const user: User = {
    id: 'external-1',
    email: 'external@pdc.ao',
    nome: 'External',
    role: 'mentor',
    areasInteresse: [],
    conquistas: [],
    xp: 0,
    reputacao: 0,
    reputacaoTier: 'BRONZE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  function authValue(role: User['role']) {
    return {
      user: { ...user, role },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      completeOtp: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFeatureFlags).mockReturnValue({
      flags: {},
      isEnabled: () => false,
      isLoading: false,
    });
    vi.mocked(useAuth).mockReturnValue(authValue('mentor'));
  });

  it('mostra indisponibilidade a uma conta externa no builder', () => {
    render(
      <MemoryRouter>
        <CreatorStudioBoundary><div>Builder</div></CreatorStudioBoundary>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Builder')).toBeNull();
    expect(screen.getByText('Estúdio temporariamente indisponível')).toBeTruthy();
  });

  it('mantém o builder acessível à conta interna de QA', () => {
    vi.mocked(useAuth).mockReturnValue(authValue('super_admin'));

    render(
      <MemoryRouter>
        <CreatorStudioBoundary><div>Builder QA</div></CreatorStudioBoundary>
      </MemoryRouter>,
    );

    expect(screen.getByText('Builder QA')).toBeTruthy();
  });

  it('fecha as páginas públicas de signup de criadores', () => {
    render(
      <MemoryRouter>
        <ExternalCreatorSignupBoundary><div>Formulário</div></ExternalCreatorSignupBoundary>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Formulário')).toBeNull();
    expect(screen.getByText('Registo de criadores temporariamente indisponível')).toBeTruthy();
  });
});
