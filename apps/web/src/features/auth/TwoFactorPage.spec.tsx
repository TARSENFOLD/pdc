import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TwoFactorPage from './TwoFactorPage';

const completeOtp = vi.fn();

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ completeOtp }),
}));

vi.mock('@/components/auth/AuthLeftPanel', () => ({
  AuthLeftPanel: () => null,
}));

vi.mock('@/lib/api/auth', () => ({
  authApi: { sendOtp: vi.fn() },
}));

describe('TwoFactorPage device trust choice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    completeOtp.mockResolvedValue(undefined);
  });

  it('requires an explicit private or shared device choice', async () => {
    const { container } = render(<MemoryRouter><TwoFactorPage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Código de Segurança'), {
      target: { value: '123456' },
    });

    expect(screen.getByRole('button', { name: 'Verificar e Aceder' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/não pedir OTP neste browser por 90 dias/i)).toBeTruthy();
    expect(screen.getByText(/pedir OTP no próximo login/i)).toBeTruthy();

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    expect(await screen.findByText(/dispositivo é privado ou partilhado/i)).toBeTruthy();
    expect(completeOtp).not.toHaveBeenCalled();
  });

  it('trusts a private browser for subsequent logins', async () => {
    render(<MemoryRouter><TwoFactorPage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Código de Segurança'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('radio', { name: /Privado/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Verificar e Aceder' }));

    await waitFor(() => {
      expect(completeOtp).toHaveBeenCalledWith('123456', 'email', true);
    });
  });

  it('does not trust a shared browser', async () => {
    render(<MemoryRouter><TwoFactorPage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Código de Segurança'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('radio', { name: /Partilhado/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Verificar e Aceder' }));

    await waitFor(() => {
      expect(completeOtp).toHaveBeenCalledWith('123456', 'email', false);
    });
  });
});
