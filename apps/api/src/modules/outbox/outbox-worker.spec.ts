import { beforeEach, describe, expect, it, vi } from 'vitest';
import { replayUnprocessedEvents } from '../events/outbox-replay.js';
import { acquireLock } from '../../lib/distributed-lock.js';
import { OUTBOX_WORKER_LOCK_KEY, OUTBOX_WORKER_LOCK_TTL_MS, createOutboxWorkerController, runOutboxWorkerOnce, startOutboxWorker } from './outbox-worker.js';

vi.mock('../events/outbox-replay.js', () => ({
  replayUnprocessedEvents: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/distributed-lock.js', () => ({
  acquireLock: vi.fn(),
}));

describe('outbox-worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(replayUnprocessedEvents).mockResolvedValue(undefined);
  });

  it('não processa replay quando outro worker detém o lock', async () => {
    vi.mocked(acquireLock).mockResolvedValueOnce(null);

    await expect(runOutboxWorkerOnce()).resolves.toEqual({ processed: false });

    expect(acquireLock).toHaveBeenCalledWith(OUTBOX_WORKER_LOCK_KEY, OUTBOX_WORKER_LOCK_TTL_MS);
    expect(replayUnprocessedEvents).not.toHaveBeenCalled();
  });

  it('processa replay e liberta lock quando lock é adquirido', async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    vi.mocked(acquireLock).mockResolvedValueOnce({
      key: OUTBOX_WORKER_LOCK_KEY,
      fencingToken: 42,
      release,
    });

    await expect(runOutboxWorkerOnce()).resolves.toEqual({ processed: true, fencingToken: 42 });

    expect(replayUnprocessedEvents).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  it('liberta lock mesmo quando replay falha', async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    vi.mocked(acquireLock).mockResolvedValueOnce({
      key: OUTBOX_WORKER_LOCK_KEY,
      fencingToken: 7,
      release,
    });
    vi.mocked(replayUnprocessedEvents).mockRejectedValueOnce(new Error('Strapi indisponível'));

    await expect(runOutboxWorkerOnce()).rejects.toThrow('Strapi indisponível');

    expect(release).toHaveBeenCalledOnce();
  });

  it('permite paragem graciosa entre iterações', async () => {
    const controller = createOutboxWorkerController();
    vi.mocked(acquireLock).mockImplementation(() => {
      controller.stop();
      return Promise.resolve(null);
    });

    await expect(startOutboxWorker(1, controller)).resolves.toBeUndefined();

    expect(acquireLock).toHaveBeenCalledOnce();
  });

  it('interrompe espera em curso quando stop é chamado', async () => {
    const controller = createOutboxWorkerController();
    vi.mocked(acquireLock).mockResolvedValue(null);

    const run = startOutboxWorker(60_000, controller);
    await vi.waitFor(() => { expect(acquireLock).toHaveBeenCalledOnce(); });
    controller.stop();

    await expect(run).resolves.toBeUndefined();
    expect(acquireLock).toHaveBeenCalledOnce();
  });
});