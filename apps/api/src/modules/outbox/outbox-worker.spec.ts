import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('não processa replay quando outro worker detém o lock', async () => {
    vi.mocked(acquireLock).mockResolvedValueOnce(null);

    await expect(runOutboxWorkerOnce()).resolves.toEqual({ processed: false });

    expect(acquireLock).toHaveBeenCalledWith(OUTBOX_WORKER_LOCK_KEY, OUTBOX_WORKER_LOCK_TTL_MS);
    expect(replayUnprocessedEvents).not.toHaveBeenCalled();
  });

  it('processa replay e liberta lock quando lock é adquirido', async () => {
    const release = vi.fn().mockResolvedValue(true);
    vi.mocked(acquireLock).mockResolvedValueOnce({
      key: OUTBOX_WORKER_LOCK_KEY,
      fencingToken: 42,
      extend: vi.fn().mockResolvedValue(true),
      release,
    });

    await expect(runOutboxWorkerOnce()).resolves.toEqual({ processed: true, fencingToken: 42 });

    expect(replayUnprocessedEvents).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  it('liberta lock mesmo quando replay falha', async () => {
    const release = vi.fn().mockResolvedValue(true);
    vi.mocked(acquireLock).mockResolvedValueOnce({
      key: OUTBOX_WORKER_LOCK_KEY,
      fencingToken: 7,
      extend: vi.fn().mockResolvedValue(true),
      release,
    });
    vi.mocked(replayUnprocessedEvents).mockRejectedValueOnce(new Error('Strapi indisponível'));

    await expect(runOutboxWorkerOnce()).rejects.toThrow('Strapi indisponível');

    expect(release).toHaveBeenCalledOnce();
  });

  it('preserva o replay concluído quando o lease expirou antes do release', async () => {
    const release = vi.fn().mockResolvedValue(false);
    vi.mocked(acquireLock).mockResolvedValueOnce({
      key: OUTBOX_WORKER_LOCK_KEY,
      fencingToken: 9,
      extend: vi.fn().mockResolvedValue(true),
      release,
    });

    await expect(runOutboxWorkerOnce()).resolves.toEqual({ processed: true, fencingToken: 9 });
    expect(replayUnprocessedEvents).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  it('renova o lease durante replays longos', async () => {
    vi.useFakeTimers();
    const extend = vi.fn().mockResolvedValue(true);
    const release = vi.fn().mockResolvedValue(true);
    let finishReplay: (() => void) | undefined;
    vi.mocked(acquireLock).mockResolvedValueOnce({
      key: OUTBOX_WORKER_LOCK_KEY,
      fencingToken: 11,
      extend,
      release,
    });
    vi.mocked(replayUnprocessedEvents).mockImplementationOnce(() => new Promise((resolve) => {
      finishReplay = resolve;
    }));

    const run = runOutboxWorkerOnce();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(extend).toHaveBeenCalledWith(OUTBOX_WORKER_LOCK_TTL_MS);
    finishReplay?.();

    await expect(run).resolves.toEqual({ processed: true, fencingToken: 11 });
    expect(release).toHaveBeenCalledOnce();
  });

  it.each([
    ['perda de ownership', false],
    ['falha Redis', new Error('Redis unavailable')],
  ])('conclui o replay idempotente e liberta o lock após %s na renovação', async (_scenario, outcome) => {
    vi.useFakeTimers();
    const extend = outcome instanceof Error
      ? vi.fn().mockRejectedValue(outcome)
      : vi.fn().mockResolvedValue(outcome);
    const release = vi.fn().mockResolvedValue(true);
    let finishReplay: (() => void) | undefined;
    vi.mocked(acquireLock).mockResolvedValueOnce({
      key: OUTBOX_WORKER_LOCK_KEY,
      fencingToken: 12,
      extend,
      release,
    });
    vi.mocked(replayUnprocessedEvents).mockImplementationOnce(() => new Promise((resolve) => {
      finishReplay = resolve;
    }));

    const run = runOutboxWorkerOnce();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(extend).toHaveBeenCalledWith(OUTBOX_WORKER_LOCK_TTL_MS);
    finishReplay?.();

    await expect(run).resolves.toEqual({ processed: true, fencingToken: 12 });
    expect(replayUnprocessedEvents).toHaveBeenCalledOnce();
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
