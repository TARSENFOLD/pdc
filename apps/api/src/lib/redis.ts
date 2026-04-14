import { Redis } from '@upstash/redis';
import { env } from './env.js';

export const hasRedis = !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

export const redis = hasRedis
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : ({
      get: async () => null,
      set: async () => 'OK',
      del: async () => 1,
      sadd: async () => 1,
      sismember: async () => 0,
      incr: async () => 1,
      expire: async () => true,
    } as any as Redis);
