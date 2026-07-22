import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/lib/api/auth';
import { toast } from '@/hooks/useToast';
import { SecuritySettingsSection } from './SecuritySettingsSection';

vi.mock('@/lib/api/auth', () => ({
  authApi: { forgetTrustedDevice: vi.fn() },
}));

vi.mock('@/hooks/useToast', () => ({
  toast: vi.fn(),
}));

function renderSection(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <SecuritySettingsSection />
    </QueryClientProvider>,
  );
}

describe('SecuritySettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mantém o botão pendente e confirma quando esquece o browser', async () => {
    let resolveRequest: ((value: { success: boolean }) => void) | undefined;
    vi.mocked(authApi).forgetTrustedDevice.mockReturnValue(new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    renderSection();

    fireEvent.click(screen.getByRole('button', { name: 'Esquecer este browser' }));

    const pendingButton = await screen.findByRole('button', { name: 'A esquecer...' });
    expect(pendingButton).toBeInstanceOf(HTMLButtonElement);
    if (!(pendingButton instanceof HTMLButtonElement)) throw new Error('Botão de segurança inválido');
    expect(pendingButton.disabled).toBe(true);
    expect(authApi.forgetTrustedDevice).toHaveBeenCalledOnce();

    await act(async () => {
      resolveRequest?.({ success: true });
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({ title: 'Este browser deixou de ser confiável.' });
    });
  });

  it('informa a falha ao esquecer o browser', async () => {
    vi.mocked(authApi).forgetTrustedDevice.mockRejectedValue(new Error('network failure'));
    renderSection();

    fireEvent.click(screen.getByRole('button', { name: 'Esquecer este browser' }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: 'Não foi possível esquecer este browser',
        variant: 'error',
      });
    });
  });
});
