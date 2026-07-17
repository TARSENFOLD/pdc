import type { RedisClientType } from 'redis';
import pino from 'pino';
import {
  assertValidRedisSetOptions,
  decodeRedisValue,
  encodeRedisScriptArgument,
  encodeRedisValue,
} from './redis-contract.js';
import type { PdcRedis, RedisSetOptions } from './redis-contract.js';

const log = pino({ name: 'redis-tcp-adapter' });
const REDIS_CONNECT_TIMEOUT_MS = 2_000;
const REDIS_MAX_RECONNECT_RETRIES = 3;
const REDIS_KEY_PREFIX = 'pdc:';

class RedisTcpAdapter implements PdcRedis {
  private client: RedisClientType | null = null;
  private connecting: Promise<RedisClientType> | null = null;

  constructor(private readonly url: string) {}

  private key(key: string): string {
    return `${REDIS_KEY_PREFIX}${key}`;
  }

  private async connectedClient(): Promise<RedisClientType> {
    if (this.client?.isReady) return this.client;
    if (this.connecting) return this.connecting;
    if (this.client?.isOpen) {
      throw new Error('Redis TCP client is reconnecting');
    }

    const attempt = import('redis').then(async ({ createClient }) => {
      const client = createClient({
        url: this.url,
        disableOfflineQueue: true,
        socket: {
          connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
          reconnectStrategy: (retries) => {
            if (retries >= REDIS_MAX_RECONNECT_RETRIES) {
              return new Error('Redis TCP reconnect retry limit reached');
            }
            return 100 * (retries + 1);
          },
        },
      });
      client.on('error', (error: unknown) => {
        log.warn({ error }, 'Redis TCP client error');
      });
      this.client = client;
      try {
        await client.connect();
        return client;
      } catch (error) {
        if (client.isOpen) client.destroy();
        if (this.client === client) this.client = null;
        throw error;
      }
    });
    this.connecting = attempt;
    try {
      return await attempt;
    } finally {
      if (this.connecting === attempt) this.connecting = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    return decodeRedisValue(await (await this.connectedClient()).get(this.key(key))) as T | null;
  }

  async set(key: string, value: unknown, options: RedisSetOptions = {}): Promise<'OK' | null> {
    assertValidRedisSetOptions(options);
    const result = await (await this.connectedClient()).set(this.key(key), encodeRedisValue(value), {
      ...(options.ex !== undefined ? { EX: options.ex } : {}),
      ...(options.px !== undefined ? { PX: options.px } : {}),
      ...(options.nx === true ? { NX: true } : {}),
    });
    return result === null ? null : 'OK';
  }

  async del(key: string): Promise<number> {
    return (await this.connectedClient()).del(this.key(key));
  }

  async sadd(key: string, member: unknown, ...members: unknown[]): Promise<number> {
    return (await this.connectedClient()).sAdd(
      this.key(key),
      [member, ...members].map(encodeRedisValue),
    );
  }

  async sismember(key: string, member: unknown): Promise<0 | 1> {
    return await (await this.connectedClient()).sIsMember(this.key(key), encodeRedisValue(member)) ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    return (await this.connectedClient()).incr(this.key(key));
  }

  async expire(key: string, seconds: number): Promise<0 | 1> {
    return await (await this.connectedClient()).expire(this.key(key), seconds) ? 1 : 0;
  }

  async rpop<T>(key: string): Promise<T | null> {
    return decodeRedisValue(await (await this.connectedClient()).rPop(this.key(key))) as T | null;
  }

  async lpush(key: string, element: unknown, ...elements: unknown[]): Promise<number> {
    return (await this.connectedClient()).lPush(
      this.key(key),
      [element, ...elements].map(encodeRedisValue),
    );
  }

  async rpush(key: string, element: unknown, ...elements: unknown[]): Promise<number> {
    return (await this.connectedClient()).rPush(
      this.key(key),
      [element, ...elements].map(encodeRedisValue),
    );
  }

  async llen(key: string): Promise<number> {
    return (await this.connectedClient()).lLen(this.key(key));
  }

  async lrem(key: string, count: number, element: unknown): Promise<number> {
    return (await this.connectedClient()).lRem(this.key(key), count, encodeRedisValue(element));
  }

  async rpoplpush<T>(source: string, destination: string): Promise<T | null> {
    return decodeRedisValue(
      await (await this.connectedClient()).rPopLPush(this.key(source), this.key(destination)),
    ) as T | null;
  }

  async eval<TResult = unknown>(script: string, keys: string[], args: unknown[]): Promise<TResult> {
    const result: unknown = await (await this.connectedClient()).eval(script, {
      keys: keys.map((key) => this.key(key)),
      arguments: args.map(encodeRedisScriptArgument),
    });
    return decodeRedisValue(result) as TResult;
  }

  async ping(): Promise<string> {
    return (await this.connectedClient()).ping();
  }
}

export function createRedisTcpAdapter(url: string): PdcRedis {
  return new RedisTcpAdapter(url);
}
