import { Redis } from '@upstash/redis';
import { env } from './env.js';

/**
 * Interface soberana para o Redis (PDC v2)
 * Inclui comandos de fila necessários para a in-flight queue.
 */
export interface PdcRedis extends Redis {
  rpoplpush: <T>(source: string, destination: string) => Promise<T | null>;
}

export const hasRedis = !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

const redisInstance = hasRedis
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL || '',
      token: env.UPSTASH_REDIS_REST_TOKEN || '',
    })
  : null;

/**
 * redis (Sovereign Instance)
 * No patamar mundial, se o Redis ausente, usamos um mock rigoroso.
 */
export const redis = (redisInstance || {
  get: async <T>(_key: string): Promise<T | null> => null,
  set: async (_key: string, _value: unknown, _opts?: { ex?: number; nx?: boolean; px?: number }): Promise<'OK' | null> => 'OK',
  del: async (_key: string): Promise<number> => 1,
  sadd: async (_key: string, ..._members: unknown[]): Promise<number> => 1,
  sismember: async (_key: string, _member: unknown): Promise<0 | 1> => 0,
  incr: async (_key: string): Promise<number> => 1,
  expire: async (_key: string, _seconds: number): Promise<0 | 1> => 1,
  rpop: async <T>(_key: string): Promise<T | null> => null,
  lpush: async (_key: string, ..._elements: unknown[]): Promise<number> => 1,
  lrem: async (_key: string, _count: number, _element: unknown): Promise<number> => 1,
  rpoplpush: async <T>(_source: string, _destination: string): Promise<T | null> => null,
  eval: async <T>(_script: string, _keys: string[], _args: unknown[]): Promise<T> => null as unknown as T,
}) as PdcRedis;
