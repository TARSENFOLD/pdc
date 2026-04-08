import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { jwtVerify } from 'jose';
import { z } from 'zod';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { redis } from '../lib/redis.js';
import { calcRecencyScore, calcScore, type FeedFeatures } from '../modules/feed/feed.scoring.js';
import type { FeedItem, FeedItemTipo } from '@pdc/shared';

// ── Strapi interfaces ───────────────────────────────────────────────────────

export interface StrapiEntity {
  id: string | number;
  slug?: string;
  titulo?: string;
  descricao?: string;
  capaUrl?: string;
  area?: string;
  autorNome?: string;
  autorId?: string;
  instituicaoNome?: string;
  aluno?: { nome: string };
  estado?: string;
  visibilidade?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface StrapiList<T> {
  data: T[];
  meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } };
}

export interface StrapiUserProfile {
  areaInteresse?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode(
  process.env['JWT_SECRET'] ?? 'change-me-in-production-min-32-chars'
);

export async function getOptionalUserId(c: Context): Promise<string | undefined> {
  try {
    const token = getCookie(c, 'access_token');
    if (!token) return undefined;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.sub as string;
  } catch {
    return undefined;
  }
}

export interface ItemStats { likes: number; ratingMedia: number; ratingTotal: number }

export async function getItemStats(tipo: FeedItemTipo, id: string): Promise<ItemStats> {
  const statsCacheKey = `feed:score:${tipo}:${id}`;
  const cached = await redis.get<ItemStats>(statsCacheKey);
  if (cached) return cached;

  try {
    const [likes, ratings] = await Promise.all([
      strapiGet<{ meta: { pagination: { total: number } } }>('/likes', {
        'filters[targetType][$eq]': tipo,
        'filters[targetId][$eq]': id,
        'pagination[limit]': '1',
      }),
      strapiGet<StrapiList<{ valor: number }>>('/ratings', {
        'filters[targetType][$eq]': tipo,
        'filters[targetId][$eq]': id,
        'pagination[limit]': '100',
      }),
    ]);

    const vals = ratings.data.map(r => r.valor);
    const ratingTotal = vals.length;
    const ratingMedia = ratingTotal > 0 ? vals.reduce((a, b) => a + b, 0) / ratingTotal : 0;

    const result: ItemStats = { likes: likes.meta.pagination.total, ratingMedia, ratingTotal };
    await redis.set(statsCacheKey, result, { ex: 300 });
    return result;
  } catch {
    return { likes: 0, ratingMedia: 0, ratingTotal: 0 };
  }
}

export async function fetchCandidates(): Promise<Array<StrapiEntity & { tipo: FeedItemTipo }>> {
  const [cursos, simulacoes, experiencias] = await Promise.all([
    strapiGet<StrapiList<StrapiEntity>>('/cursos', {
      'pagination[limit]': '100',
      sort: 'publishedAt:desc',
      populate: 'capa,autor',
    }),
    strapiGet<StrapiList<StrapiEntity>>('/simulacoes', {
      'pagination[limit]': '100',
      sort: 'publishedAt:desc',
      populate: 'capa',
    }),
    strapiGet<StrapiList<StrapiEntity>>('/experiencias', {
      'pagination[limit]': '100',
      sort: 'publishedAt:desc',
      populate: 'capa,instituicao',
    }),
  ]);

  return [
    ...cursos.data.map(d => ({ ...d, tipo: 'curso' as const })),
    ...simulacoes.data.map(d => ({ ...d, tipo: 'simulacao' as const })),
    ...experiencias.data.map(d => ({ ...d, tipo: 'experiencia' as const })),
  ].filter(c => {
    const estado = c.estado ?? 'published';
    const vis = c.visibilidade ?? 'publico';
    return estado === 'published' && vis === 'publico';
  });
}

export const HYDRATION_CONCURRENCY = 10;

export async function mapConcurrent<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

export function toFeedItem(c: StrapiEntity & { tipo: FeedItemTipo }, stats: ItemStats, score: number, recencyScore: number): FeedItem {
  return {
    tipo: c.tipo,
    id: String(c.id),
    slug: c.slug,
    titulo: c.titulo ?? '',
    descricao: c.descricao ?? '',
    capaUrl: c.capaUrl,
    area: c.area,
    autorNome: c.autorNome ?? c.instituicaoNome ?? c.aluno?.nome,
    autorId: c.autorId,
    score,
    recencyScore,
    stats: { likes: stats.likes, ratingMedia: stats.ratingMedia, ratingTotal: stats.ratingTotal },
    publicadoEm: c.publishedAt ?? c.createdAt,
  };
}

export function buildFeatures(stats: ItemStats, recency: number, affinityBoost = 0, authorReputation = 0): FeedFeatures {
  const engagementNorm = Math.min(1, (stats.likes * 2 + stats.ratingTotal * 5) / 100);
  const ratingNorm = stats.ratingMedia / 5;
  return {
    engagement: engagementNorm,
    completion: 0,
    rating: ratingNorm,
    recency,
    reputation: authorReputation / 100,
    affinity: affinityBoost,
    time: 0,
  };
}

export { calcRecencyScore, calcScore };

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
