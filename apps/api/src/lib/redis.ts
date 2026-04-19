import { Redis } from '@upstash/redis';
import { env } from './env.js';

export const hasRedis = !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

/**
 * redis (Sovereign Instance)
 * No patamar mundial, se o Redis ausente, usamos um mock tipado 
 * para garantir que o sistema não crasha.
 */
export const redis = hasRedis
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL || '',
      token: env.UPSTASH_REDIS_REST_TOKEN || '',
    })
  : ({
      get: async <T>(_key: string): Promise<T | null> => null,
      set: async (_key: string, _value: unknown, _opts?: { ex?: number }): Promise<'OK'> => 'OK',
      del: async (_key: string): Promise<number> => 1,
      sadd: async (_key: string, ..._members: unknown[]): Promise<number> => 1,
      sismember: async (_key: string, _member: unknown): Promise<0 | 1> => 0,
      incr: async (_key: string): Promise<number> => 1,
      expire: async (_key: string, _seconds: number): Promise<0 | 1> => 1,
    } as unknown as Redis); 
