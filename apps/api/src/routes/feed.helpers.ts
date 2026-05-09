import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { jwtVerify } from 'jose';
import { z } from 'zod';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { redis } from '../lib/redis.js';
import { calcRecencyScore, calcScore, type FeedFeatures } from '../modules/feed/feed.scoring.js';
import { AreaVocacionalSchema, type FeedItem, type FeedItemTipo } from '@pdc/shared';
import { env } from '../lib/env.js';

// ── Strapi interfaces (Flat v5) ──────────────────────────────────────────────

export interface StrapiEntity {
  id: string | number;
  slug?: string;
  titulo?: string;
  corpo?: string;
  descricao?: string;
  capaUrl?: string;
  mediaUrls?: string[] | null;
  area?: string;
  autorNome?: string;
  autorId?: string;
  autor?: {
    id?: string | number;
    userId?: string;
    nome?: string;
    foto?: { url?: string } | null;
  } | null;
  instituicaoNome?: string;
  estudante?: { nome: string };
  estado?: string;
  visibilidade?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface StrapiUserProfile {
  areaInteresse?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

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

export interface ItemStats {
  likes: number;
  ratingMedia: number;
  ratingTotal: number;
}

function titleFromContent(c: StrapiEntity & { tipo: FeedItemTipo }): string {
  const explicit = c.titulo?.trim();
  if (explicit) return explicit;

  const text = (c.corpo ?? c.descricao ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return c.tipo;
  return text.length <= 80 ? text : `${text.slice(0, 77)}...`;
}

export async function getItemStats(tipo: FeedItemTipo, id: string): Promise<ItemStats> {
  const statsCacheKey = `feed:score:${tipo}:${id}`;
  const cached = await redis.get<ItemStats>(statsCacheKey);
  if (cached) return cached;

  try {
    const [likes, ratings] = await Promise.all([
      strapiGet<unknown>('/likes', {
        'filters[targetType][$eq]': tipo,
        'filters[targetId][$eq]': id,
        'pagination[limit]': '1',
      }),
      strapiGet<{ valor: number }>('/ratings', {
        'filters[targetType][$eq]': tipo,
        'filters[targetId][$eq]': id,
        'pagination[limit]': '100',
      }),
    ]);

    const vals = ratings.data.map((r) => r.valor);
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
  const [cursos, simulacoes, experiencias, feedPosts, programas, projetos] = await Promise.all([
    strapiGet<StrapiEntity>('/cursos', {
      'pagination[pageSize]': '100',
      sort: 'publishedAt:desc',
      populate: 'autor',
    }),
    strapiGet<StrapiEntity>('/simulacoes', {
      'pagination[pageSize]': '100',
      sort: 'publishedAt:desc',
      populate: 'autor',
    }),
    strapiGet<StrapiEntity>('/experiencias', {
      'pagination[pageSize]': '100',
      sort: 'publishedAt:desc',
      populate: 'instituicao',
    }),
    strapiGet<StrapiEntity>('/feed-posts', {
      'filters[estado][$eq]': 'aprovada',
      'pagination[pageSize]': '100',
      sort: 'createdAt:desc',
      populate: 'autor.foto',
    }),
    strapiGet<StrapiEntity>('/programas', {
      'pagination[pageSize]': '100',
      sort: 'publishedAt:desc',
      populate: 'capa,instituicao,responsavel',
    }),
    strapiGet<StrapiEntity>('/projetos', {
      'pagination[pageSize]': '100',
      sort: 'createdAt:desc',
      populate: 'autor,media',
    }),
  ]);

  const all = [
    ...cursos.data.map((d) => ({ ...d, tipo: 'curso' as const })),
    ...simulacoes.data.map((d) => ({ ...d, tipo: 'simulacao' as const })),
    ...experiencias.data.map((d) => ({ ...d, tipo: 'experiencia' as const })),
    ...feedPosts.data.map((d) => ({ ...d, tipo: 'post' as const })),
    ...programas.data.map((d) => ({ ...d, tipo: 'programa' as const })),
    ...projetos.data.map((d) => ({ ...d, tipo: 'projeto' as const })),
  ] as Array<StrapiEntity & { tipo: FeedItemTipo }>;

  return all.filter((c) => {
    if (c.tipo === 'post') return c.estado === 'aprovada';
    const estado = c.estado ?? 'published';
    const vis = c.visibilidade ?? 'publico';
    return estado === 'published' && vis === 'publico';
  });
}

export const HYDRATION_CONCURRENCY = 10;

export async function mapConcurrent<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

/**
 * toFeedItem (Sovereign Mapping)
 * Converte entidades Strapi para o FeedItem do Shared.
 */
export function toFeedItem(
  c: StrapiEntity & { tipo: FeedItemTipo },
  stats: ItemStats,
  score: number,
  recencyScore: number
): FeedItem {
  const parsedArea = AreaVocacionalSchema.safeParse(c.area);
  const mediaUrls = Array.isArray(c.mediaUrls) ? c.mediaUrls : [];
  const title = titleFromContent(c);
  const body = c.corpo ?? c.descricao ?? '';
  const authorId = c.autor?.userId ?? c.autorId ?? c.autor?.id ?? c.id;

  return {
    id: String(c.id),
    tipo: c.tipo,
    userId: String(authorId),
    timestamp: c.publishedAt ?? c.createdAt,
    titulo: title,
    corpo: body,
    createdAt: c.publishedAt ?? c.createdAt,
    slug: c.slug,
    capaUrl: c.capaUrl,
    avatar: c.autor?.foto?.url ?? undefined,
    imagem: mediaUrls[0],
    area: parsedArea.success ? parsedArea.data : undefined,
    autorNome: c.autor?.nome ?? c.autorNome ?? c.instituicaoNome ?? c.estudante?.nome,
    score,
    recencyScore,
    stats: { likes: stats.likes, ratingMedia: stats.ratingMedia, ratingTotal: stats.ratingTotal },
  };
}

export function buildFeatures(
  stats: ItemStats,
  recency: number,
  affinityBoost = 0,
  authorReputation = 0
): FeedFeatures {
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
