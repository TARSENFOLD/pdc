import type { FeedItemTipo, FeedWeights } from '@pdc/shared';

export interface FeedFeatures {
  engagement: number;
  completion: number;
  rating: number;
  recency: number;
  reputation: number;
  affinity: number;
  time: number;
}

export function calcRecencyScore(publicadoEm: string, tipo: FeedItemTipo): number {
  const publishedAt = new Date(publicadoEm).getTime();
  const now = Date.now();
  const hoursOld = (now - publishedAt) / (1000 * 60 * 60);

  // Simulações e experiências decaem mais devagar (expoente 1.0)
  const exponent = (tipo === 'simulacao' || tipo === 'experiencia') ? 1.0 : 1.5;
  return 1 / (1 + Math.pow(Math.max(0, hoursOld), exponent));
}

export function calcScore(features: FeedFeatures, weights: FeedWeights): number {
  const raw =
    features.engagement * weights.engagement +
    features.completion * weights.completion +
    features.rating * weights.rating +
    features.recency * weights.recency +
    features.reputation * weights.reputation +
    features.affinity * weights.affinity +
    features.time * weights.time;

  return Math.max(0, Math.min(1, raw));
}
