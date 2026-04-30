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
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/**
 * redis (Sovereign Instance)
 * No patamar mundial, se o Redis ausente, usamos um mock rigoroso.
 */
export const redis = (redisInstance || {
  get: <T>(_key: string): Promise<T | null> => Promise.resolve(null),
  set: (_key: string, _value: unknown, _opts?: { ex?: number; nx?: boolean; px?: number }): Promise<'OK' | null> => Promise.resolve('OK'),
  del: (_key: string): Promise<number> => Promise.resolve(1),
  sadd: (_key: string, ..._members: unknown[]): Promise<number> => Promise.resolve(1),
  sismember: (_key: string, _member: unknown): Promise<0 | 1> => Promise.resolve(0),
  incr: (_key: string): Promise<number> => Promise.resolve(1),
  expire: (_key: string, _seconds: number): Promise<0 | 1> => Promise.resolve(1),
  rpop: <T>(_key: string): Promise<T | null> => Promise.resolve(null),
  lpush: (_key: string, ..._elements: unknown[]): Promise<number> => Promise.resolve(1),
  lrem: (_key: string, _count: number, _element: unknown): Promise<number> => Promise.resolve(1),
  rpoplpush: <T>(_source: string, _destination: string): Promise<T | null> => Promise.resolve(null),
  eval: <T>(_script: string, _keys: string[], _args: unknown[]): Promise<T> => Promise.resolve(null as unknown as T),
}) as PdcRedis;
