import { afterEach, describe, expect, it, vi } from 'vitest';

const connectMock = vi.hoisted(() => vi.fn(() => new Promise<void>(() => undefined)));

vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    isOpen: false,
    isReady: false,
    on: vi.fn(),
    connect: connectMock,
  })),
}));

import { createRedisTcpAdapter } from './redis-tcp-adapter.js';

describe('RedisTcpAdapter readiness', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('aplica a deadline também ao estabelecimento da ligação', async () => {
    vi.useFakeTimers();
    const client = createRedisTcpAdapter('redis://localhost:6379');

    const readiness = client.probeReadiness?.(25);
    await vi.advanceTimersByTimeAsync(25);

    await expect(readiness).resolves.toBe(false);
    expect(connectMock).toHaveBeenCalledOnce();
  });
});
