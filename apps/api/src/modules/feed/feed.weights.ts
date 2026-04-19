import { redis, hasRedis } from '../../lib/redis.js';
import type { FeedWeights } from '@pdc/shared';

export const DEFAULT_WEIGHTS_GERAL: FeedWeights = {
  engagement: 0.20,
  completion: 0.15,
  rating: 0.15,
  recency: 0.15,
  reputation: 0.10,
  affinity: 0.15,
  time: 0.10,
};

export const DEFAULT_WEIGHTS_TRENDING: FeedWeights = {
  engagement: 0.30,
  completion: 0.10,
  rating: 0.20,
  recency: 0.20,
  reputation: 0.10,
  affinity: 0.05,
  time: 0.05,
};

export async function getWeights(tipo: 'geral' | 'trending'): Promise<FeedWeights> {
  if (hasRedis) {
    const cached = await redis.get<FeedWeights>(`feed:weights:${tipo}`);
    if (cached) return cached;
  }
  return tipo === 'trending' ? DEFAULT_WEIGHTS_TRENDING : DEFAULT_WEIGHTS_GERAL;
}

export async function setWeights(tipo: 'geral' | 'trending', weights: FeedWeights): Promise<void> {
  if (!hasRedis) return;
  await redis.set(`feed:weights:${tipo}`, weights);
}
