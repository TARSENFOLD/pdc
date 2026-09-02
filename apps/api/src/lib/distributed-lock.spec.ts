import { beforeEach, describe, expect, it, vi } from 'vitest';
import { acquireLock } from './distributed-lock.js';

const redisMocks = vi.hoisted(() => ({
  incr: vi.fn(),
  set: vi.fn(),
  eval: vi.fn(),
}));

vi.mock('./redis.js', () => ({
  redis: redisMocks,
}));

describe('distributed lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMocks.incr.mockResolvedValue(7);
    redisMocks.set.mockResolvedValue('OK');
    redisMocks.eval.mockResolvedValue(1);
  });

  it('renova e liberta o lock apenas enquanto mantém a posse', async () => {
    const lock = await acquireLock('institution:23', 30_000);

    expect(redisMocks.set).toHaveBeenCalledWith('institution:23', 'lock:7', { nx: true, ex: 30 });
    await expect(lock?.extend(30_000)).resolves.toBe(true);
    await expect(lock?.release()).resolves.toBe(true);
    expect(redisMocks.eval).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("redis.call('EXPIRE'"),
      ['institution:23'],
      ['lock:7', '30'],
    );
    expect(redisMocks.eval).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("redis.call('DEL'"),
      ['institution:23'],
      ['lock:7'],
    );
  });

  it('informa perda do lease durante a renovação', async () => {
    redisMocks.eval.mockResolvedValueOnce(0);
    const lock = await acquireLock('institution:23', 30_000);

    await expect(lock?.extend(30_000)).resolves.toBe(false);
  });

  it('torna observável a perda de posse antes do release', async () => {
    redisMocks.eval.mockResolvedValueOnce(0);
    const lock = await acquireLock('institution:23', 30_000);

    await expect(lock?.release()).resolves.toBe(false);
  });

  it('propaga uma falha Redis durante a renovação', async () => {
    const cause = new Error('Redis unavailable');
    const lock = await acquireLock('institution:23', 30_000);
    redisMocks.eval.mockRejectedValueOnce(cause);

    await expect(lock?.extend(30_000)).rejects.toBe(cause);
  });

  it('torna observável uma falha Redis durante o release', async () => {
    const cause = new Error('Redis unavailable');
    redisMocks.eval.mockRejectedValueOnce(cause);
    const lock = await acquireLock('institution:23', 30_000);

    await expect(lock?.release()).rejects.toBe(cause);
  });
});
