import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  initialized: false,
  initWebSentry: vi.fn(() => {
    mocks.initialized = true;
  }),
  captureException: vi.fn(),
}));

vi.mock('@sentry/react', () => ({
  captureException: mocks.captureException,
}));

vi.mock('./lib/sentry', () => ({
  initWebSentry: mocks.initWebSentry,
}));

vi.mock('./main', () => {
  if (!mocks.initialized) throw new Error('Aplicação carregada antes do Sentry');
  return {};
});

describe('web entrypoint', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.initialized = false;
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('inicializa o Sentry antes de carregar a aplicação', async () => {
    await import('./entry');

    await vi.waitFor(() => {
      expect(mocks.initWebSentry).toHaveBeenCalledOnce();
    });
    expect(mocks.captureException).not.toHaveBeenCalled();
  });

  it('captura falhas de importação e apresenta uma recuperação visível', async () => {
    const importError = new Error('chunk indisponível');
    const reloadPage = vi.fn();
    const { loadWebApplication } = await import('./entry');

    await loadWebApplication(() => Promise.reject(importError), reloadPage);

    expect(mocks.captureException).toHaveBeenCalledWith(importError);
    expect(document.querySelector('h1')?.textContent).toBe('Falha na inicialização');
    const retryButton = document.querySelector<HTMLButtonElement>('button');
    expect(retryButton?.textContent).toBe('Tentar novamente');

    retryButton?.click();
    expect(reloadPage).toHaveBeenCalledOnce();
  });
});
