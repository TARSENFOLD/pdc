import { describe, expect, it, vi } from 'vitest';
import { createUuid } from './uuid';

describe('createUuid', () => {
  it('uses crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => '11111111-1111-4111-8111-111111111111');
    const cryptoLike = { randomUUID } as unknown as Crypto;

    expect(createUuid(cryptoLike)).toBe('11111111-1111-4111-8111-111111111111');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('falls back to getRandomValues when randomUUID is unavailable', () => {
    const getRandomValues = vi.fn((array: Uint8Array) => {
      array.fill(0);
      return array;
    });
    const cryptoLike = { getRandomValues } as unknown as Crypto;

    const id = createUuid(cryptoLike);

    expect(getRandomValues).toHaveBeenCalledOnce();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
