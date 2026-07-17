const REDIS_VALUE_PREFIX = 'pdcv1:';

type RedisExpiry =
  | { ex: number; px?: never }
  | { ex?: never; px: number }
  | { ex?: never; px?: never };

export type RedisSetOptions = RedisExpiry & { nx?: boolean };

export interface PdcRedis {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown, options?: RedisSetOptions) => Promise<'OK' | null>;
  del: (key: string) => Promise<number>;
  sadd: (key: string, member: unknown, ...members: unknown[]) => Promise<number>;
  sismember: (key: string, member: unknown) => Promise<0 | 1>;
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<0 | 1>;
  rpop: <T>(key: string) => Promise<T | null>;
  lpush: (key: string, element: unknown, ...elements: unknown[]) => Promise<number>;
  rpush: (key: string, element: unknown, ...elements: unknown[]) => Promise<number>;
  llen: (key: string) => Promise<number>;
  lrem: (key: string, count: number, element: unknown) => Promise<number>;
  rpoplpush: <T>(source: string, destination: string) => Promise<T | null>;
  eval: <TResult = unknown>(script: string, keys: string[], args: unknown[]) => Promise<TResult>;
  ping: () => Promise<string>;
}

export function assertValidRedisSetOptions(options: { ex?: number; px?: number }): void {
  if (options.ex !== undefined && options.px !== undefined) {
    throw new TypeError('Redis SET cannot combine EX and PX');
  }
}

function isJsonAmbiguousString(value: string): boolean {
  if (value.startsWith(REDIS_VALUE_PREFIX)) return true;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function encodeRedisValue(value: unknown): string {
  if (typeof value === 'string' && !isJsonAmbiguousString(value)) return value;
  const encoded: unknown = JSON.stringify(value);
  if (typeof encoded !== 'string') throw new TypeError('Redis value is not serializable');
  return `${REDIS_VALUE_PREFIX}${encoded}`;
}

export function decodeRedisValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeRedisValue);
  if (typeof value !== 'string' || !value.startsWith(REDIS_VALUE_PREFIX)) return value;
  try {
    const decoded: unknown = JSON.parse(value.slice(REDIS_VALUE_PREFIX.length));
    return decoded;
  } catch {
    return value;
  }
}

export function encodeRedisScriptArgument(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  const encoded: unknown = JSON.stringify(value);
  if (typeof encoded !== 'string') throw new TypeError('Redis script argument is not serializable');
  return encoded;
}
