import { describe, expect, it } from 'vitest';
import {
  assertValidRedisSetOptions,
  decodeRedisValue,
  encodeRedisScriptArgument,
  encodeRedisValue,
} from './redis-contract.js';

describe('Redis adapter contract', () => {
  it.each([
    'plain',
    '123',
    'true',
    'null',
    '{"event":"created"}',
    'pdcv1:literal',
    123,
    true,
    false,
    { nested: ['value'] },
    null,
  ])('preserves an exact value round trip for %j', (value) => {
    expect(decodeRedisValue(encodeRedisValue(value))).toEqual(value);
  });

  it('keeps Lua arguments raw', () => {
    expect(encodeRedisScriptArgument('123')).toBe('123');
    expect(encodeRedisScriptArgument(600)).toBe('600');
  });

  it('decodes adapter values recursively in composite Lua replies', () => {
    const reply = [
      encodeRedisValue('123'),
      [encodeRedisValue(true), encodeRedisValue({ event: 'created' })],
      'legacy-value',
    ];

    expect(decodeRedisValue(reply)).toEqual(['123', [true, { event: 'created' }], 'legacy-value']);
  });

  it('rejects simultaneous EX and PX at runtime', () => {
    expect(() => {
      assertValidRedisSetOptions({ ex: 60, px: 1_000 });
    }).toThrow(/cannot combine EX and PX/);
  });

  it.each([
    { ex: 0 },
    { ex: -1 },
    { ex: 1.5 },
    { px: Number.NaN },
    { px: Number.POSITIVE_INFINITY },
  ])('rejects invalid Redis expiry %j', (options) => {
    expect(() => {
      assertValidRedisSetOptions(options);
    }).toThrow(/must be a positive integer/);
  });
});
