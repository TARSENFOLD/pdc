import { Redis } from '@upstash/redis';
import { env } from './env.js';
import { createRedisTcpAdapter } from './redis-tcp-adapter.js';
import {
  assertValidRedisSetOptions,
  decodeRedisValue,
  encodeRedisScriptArgument,
  encodeRedisValue,
} from './redis-contract.js';
import type { PdcRedis, RedisSetOptions } from './redis-contract.js';

export type { PdcRedis, RedisSetOptions } from './redis-contract.js';

function createUpstashAdapter(client: Redis): PdcRedis {
  return {
    get: async <T>(key: string) => decodeRedisValue(await client.get<unknown>(key)) as T | null,
    set: async (key, value, options = {}) => {
      assertValidRedisSetOptions(options);
      const encodedValue = encodeRedisValue(value);
      let result: unknown;
      if (options.ex !== undefined && options.nx === true) {
        result = await client.set(key, encodedValue, { ex: options.ex, nx: true });
      } else if (options.px !== undefined && options.nx === true) {
        result = await client.set(key, encodedValue, { px: options.px, nx: true });
      } else if (options.ex !== undefined) {
        result = await client.set(key, encodedValue, { ex: options.ex });
      } else if (options.px !== undefined) {
        result = await client.set(key, encodedValue, { px: options.px });
      } else if (options.nx === true) {
        result = await client.set(key, encodedValue, { nx: true });
      } else {
        result = await client.set(key, encodedValue);
      }
      return result === null ? null : 'OK';
    },
    del: (key) => client.del(key),
    sadd: (key, member, ...members) => client.sadd(
      key,
      encodeRedisValue(member),
      ...members.map(encodeRedisValue),
    ),
    sismember: (key, member) => client.sismember(key, encodeRedisValue(member)),
    incr: (key) => client.incr(key),
    expire: (key, seconds) => client.expire(key, seconds),
    rpop: async <T>(key: string) => decodeRedisValue(await client.rpop<unknown>(key)) as T | null,
    lpush: (key, element, ...elements) => client.lpush(
      key,
      encodeRedisValue(element),
      ...elements.map(encodeRedisValue),
    ),
    rpush: (key, element, ...elements) => client.rpush(
      key,
      encodeRedisValue(element),
      ...elements.map(encodeRedisValue),
    ),
    llen: (key) => client.llen(key),
    lrem: (key, count, element) => client.lrem(key, count, encodeRedisValue(element)),
    rpoplpush: async <T>(source: string, destination: string) => decodeRedisValue(
      await client.eval(
        'return redis.call("RPOPLPUSH", KEYS[1], KEYS[2])',
        [source, destination],
        [],
      ),
    ) as T | null,
    eval: async <TResult>(script: string, keys: string[], args: unknown[]) => decodeRedisValue(
      await client.eval(script, keys, args.map(encodeRedisScriptArgument)),
    ) as TResult,
    ping: () => client.ping(),
  };
}

const hasUpstashConfiguration = Boolean(
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN,
);

export const upstashRedis = hasUpstashConfiguration
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const upstashDataRedis = hasUpstashConfiguration
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
      automaticDeserialization: false,
    })
  : null;

const upstashAdapter = upstashDataRedis ? createUpstashAdapter(upstashDataRedis) : null;
const localRedis = env.PDC_REDIS_URL ? createRedisTcpAdapter(env.PDC_REDIS_URL) : null;

export const hasUpstashRedis = upstashAdapter !== null;
export const hasPrimaryRedis = localRedis !== null;
export const hasRedis = hasPrimaryRedis || hasUpstashRedis;

const redisUnavailableError = () => new Error('Redis não configurado: operação indisponível no mock local');

const redisMock = {
  get: <T>(_key: string): Promise<T | null> => Promise.resolve(null),
  set: (_key: string, _value: unknown, _opts?: RedisSetOptions): Promise<'OK' | null> => Promise.resolve('OK'),
  del: (_key: string): Promise<number> => Promise.resolve(1),
  sadd: (_key: string, _member: unknown, ..._members: unknown[]): Promise<number> => Promise.resolve(1),
  sismember: (_key: string, _member: unknown): Promise<0 | 1> => Promise.resolve(0),
  incr: (_key: string): Promise<number> => Promise.resolve(1),
  expire: (_key: string, _seconds: number): Promise<0 | 1> => Promise.resolve(1),
  rpop: <T>(_key: string): Promise<T | null> => Promise.resolve(null),
  lpush: (_key: string, _element: unknown, ..._elements: unknown[]): Promise<number> => Promise.resolve(1),
  rpush: (_key: string, _element: unknown, ..._elements: unknown[]): Promise<number> => Promise.resolve(1),
  llen: (_key: string): Promise<number> => Promise.resolve(0),
  lrem: (_key: string, _count: number, _element: unknown): Promise<number> => Promise.resolve(1),
  rpoplpush: <T>(_source: string, _destination: string): Promise<T | null> => Promise.resolve(null),
  eval: <TResult = unknown>(_script: string, _keys: string[], _args: unknown[]): Promise<TResult> => Promise.reject(redisUnavailableError()),
  ping: (): Promise<string> => Promise.reject(redisUnavailableError()),
} satisfies PdcRedis;

// Redis local e a fonte primaria do BFF. Upstash continua como fallback de
// desenvolvimento e como transporte partilhado com o Cloudflare Edge.
export const redis: PdcRedis = localRedis ?? upstashAdapter ?? redisMock;
export const telemetryRedis: PdcRedis = upstashAdapter ?? localRedis ?? redisMock;

export async function isPrimaryRedisReady(): Promise<boolean> {
  if (!localRedis) return false;
  try {
    return await localRedis.ping() === 'PONG';
  } catch {
    return false;
  }
}
