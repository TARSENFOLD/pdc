import { describe, expect, it, vi } from 'vitest';

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
  it('inicializa o Sentry antes de carregar a aplicação', async () => {
    await import('./entry');

    await vi.waitFor(() => {
      expect(mocks.initWebSentry).toHaveBeenCalledOnce();
    });
    expect(mocks.captureException).not.toHaveBeenCalled();
  });
});
