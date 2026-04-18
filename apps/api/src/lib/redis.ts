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
  : {
      get: async <T = any>(_key: string): Promise<T | null> => null,
      set: async (_key: string, _value: any, _opts?: any): Promise<'OK'> => 'OK',
      del: async (_key: string): Promise<number> => 1,
      sadd: async (_key: string, _member: any): Promise<number> => 1,
      sismember: async (_key: string, _member: any): Promise<number> => 0,
      incr: async (_key: string): Promise<number> => 1,
      expire: async (_key: string, _seconds: number): Promise<boolean> => true,
    } as unknown as Redis; 
