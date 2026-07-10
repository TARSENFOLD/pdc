import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistoMentorPage } from '../RegistoMentorPage';
import { RegistoInstituicaoPage } from '../RegistoInstituicaoPage';
import { authApi } from '@/lib/api/auth';
import type { User } from '@pdc/shared';

vi.mock('@/lib/api/auth', () => ({
  authApi: {
    registarMentor: vi.fn(),
    registarInstituicao: vi.fn(),
    loginWithGoogle: vi.fn(),
    loginWithLinkedIn: vi.fn(),
  },
}));

vi.mock('../AuthSplitLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../OAuthButtons', () => ({
  AuthDivider: () => <div data-testid="auth-divider" />,
  OAuthButtons: () => <div data-testid="oauth-buttons" />,
}));

vi.mock('../LegalConsentField', () => ({
  LegalConsentField: ({ checked, onCheckedChange, error }: { checked: boolean; onCheckedChange: (checked: boolean) => void; error?: string }) => (
    <label>
      Aceitar documentos legais
      <input type="checkbox" checked={checked} onChange={(event) => { onCheckedChange(event.target.checked); }} />
      {error ? <span>{error}</span> : null}
    </label>
  ),
}));

function renderWithRouter(ui: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/criar-conta/teste']}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function makeUser(role: User['role'], email: string): User {
  return {
    id: `user-${role}`,
    email,
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

describe('pós-registo mentor/instituição', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mentor vê confirmação de submissão após registo', async () => {
    vi.mocked(authApi.registarMentor).mockResolvedValueOnce(makeUser('mentor', 'mentor@pdc.ao'));
    const { container } = renderWithRouter(<RegistoMentorPage />);
    const inputs = Array.from(container.querySelectorAll('input'));

    fireEvent.change(inputs[0] as HTMLInputElement, { target: { value: 'Mentor PDC' } });
    fireEvent.change(inputs[1] as HTMLInputElement, { target: { value: 'mentor@pdc.ao' } });
    fireEvent.change(screen.getByLabelText('Palavra-passe'), { target: { value: 'SenhaTeste123' } });
    fireEvent.change(screen.getByLabelText('Confirmar palavra-passe'), { target: { value: 'SenhaTeste123' } });
    fireEvent.click(screen.getByLabelText('Aceitar documentos legais'));
    fireEvent.submit(screen.getByRole('button', { name: /submeter para validação/i }).closest('form') as HTMLFormElement);

    const confirmation = await screen.findByText(/Conta criada com sucesso/i);
    expect(confirmation).toBeTruthy();
    const loginLink = await screen.findByRole('link', { name: /Ir para login/i });
    expect(loginLink.getAttribute('href')).toBe('/login');
  });

  it('instituição vê confirmação de submissão após registo', async () => {
    vi.mocked(authApi.registarInstituicao).mockResolvedValueOnce(makeUser('instituicao', 'instituicao@pdc.ao'));
    const { container } = renderWithRouter(<RegistoInstituicaoPage />);
    const inputs = Array.from(container.querySelectorAll('input'));
    const selects = Array.from(container.querySelectorAll('select'));

    fireEvent.change(inputs[0] as HTMLInputElement, { target: { value: 'Instituição PDC' } });
    fireEvent.change(inputs[1] as HTMLInputElement, { target: { value: '5000123456' } });
    fireEvent.change(inputs[2] as HTMLInputElement, { target: { value: 'instituicao@pdc.ao' } });
    fireEvent.change(screen.getByLabelText('Palavra-passe'), { target: { value: 'SenhaTeste123' } });
    fireEvent.change(screen.getByLabelText('Confirmar palavra-passe'), { target: { value: 'SenhaTeste123' } });
    fireEvent.change(selects[1] as HTMLSelectElement, { target: { value: 'Luanda' } });
    fireEvent.click(screen.getByLabelText('Aceitar documentos legais'));
    fireEvent.submit(screen.getByRole('button', { name: /registar instituição/i }).closest('form') as HTMLFormElement);

    const confirmation = await screen.findByText(/Registo submetido/i);
    expect(confirmation).toBeTruthy();
    const loginLink = await screen.findByRole('link', { name: /Ir para login/i });
    expect(loginLink.getAttribute('href')).toBe('/login');
  });
});
