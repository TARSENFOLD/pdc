import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { z } from 'zod';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { redis } from '../lib/redis.js';
import { calcRecencyScore, calcScore, type FeedFeatures } from '../modules/feed/feed.scoring.js';
import { AreaVocacionalSchema, type FeedItem, type FeedItemTipo } from '@pdc/shared';
import { verifyAccessJwt } from '../modules/auth/auth.middleware.js';
import { ACCESS_TOKEN_COOKIE } from '../modules/auth/auth.constants.js';
import { isPublicCatalogEstado } from './publication-state.js';
import { resolvePerfilAvatar } from '../modules/perfil/perfil-media.js';

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
    avatarUrl?: string | null;
  } | null;
  instituicaoNome?: string;
  estudante?: { nome: string };
  estado?: string;
  visibilidade?: string;
  publishedAt?: string;
  createdAt: string;
  criadoEm?: string;
  nota?: string;
  targetType?: string;
  targetId?: string;
  actor?: {
    id?: string | number;
    userId?: string;
    nome?: string;
    foto?: { url?: string } | null;
    avatarUrl?: string | null;
  } | null;
  originalPost?: StrapiEntity;
}

export interface StrapiUserProfile {
  areaInteresse?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export async function getOptionalUserId(c: Context): Promise<string | undefined> {
  const token = getCookie(c, ACCESS_TOKEN_COOKIE);
  if (!token) return undefined;
  try {
    return (await verifyAccessJwt(token))?.sub;
  } catch {
    return undefined;
  }
}

export interface ItemStats {
  likes: number;
  comentarios: number;
  shares: number;
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
    const [likes, comments, shares, ratings] = await Promise.all([
      strapiGet<unknown>('/likes', {
        'filters[targetType][$eq]': tipo,
        'filters[targetId][$eq]': id,
        'pagination[limit]': '1',
      }),
      strapiGet<unknown>('/comments', {
        'filters[targetType][$eq]': tipo,
        'filters[targetId][$eq]': id,
        'filters[estado][$eq]': 'ativo',
        'pagination[pageSize]': '1',
      }),
      strapiGet<unknown>('/partilhas', {
        'filters[targetType][$eq]': tipo,
        'filters[targetId][$eq]': id,
        'pagination[pageSize]': '1',
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

    const result: ItemStats = {
      likes: likes.meta.pagination.total,
      comentarios: comments.meta.pagination.total,
      shares: shares.meta.pagination.total,
      ratingMedia,
      ratingTotal,
    };
    await redis.set(statsCacheKey, result, { ex: 300 });
    return result;
  } catch {
    return { likes: 0, comentarios: 0, shares: 0, ratingMedia: 0, ratingTotal: 0 };
  }
}

export async function fetchCandidates(): Promise<Array<StrapiEntity & { tipo: FeedItemTipo }>> {
  const [cursos, simulacoes, experiencias, feedPosts, programas, projetos, partilhas] = await Promise.all([
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
    strapiGet<StrapiEntity>('/partilhas', {
      'filters[canal][$eq]': 'interno',
      'filters[targetType][$eq]': 'post',
      'pagination[pageSize]': '100',
      sort: 'criadoEm:desc',
      populate: 'actor.foto',
    }),
  ]);

  const postsById = new Map(feedPosts.data.map((post) => [String(post.id), post]));
  const missingPostIds = [...new Set(partilhas.data
    .map((share) => share.targetId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0 && !postsById.has(id)))];
  if (missingPostIds.length > 0) {
    const missingPostFilters = Object.fromEntries(
      missingPostIds.map((id, index) => [`filters[id][$in][${index.toString()}]`, id]),
    );
    const missingPosts = await strapiGet<StrapiEntity>('/feed-posts', {
      ...missingPostFilters,
      'filters[estado][$eq]': 'aprovada',
      'pagination[pageSize]': String(missingPostIds.length),
      populate: 'autor.foto',
    });
    for (const post of missingPosts.data) {
      postsById.set(String(post.id), post);
    }
  }
  const shares = partilhas.data.flatMap((share) => {
    const originalPost = postsById.get(String(share.targetId));
    if (!originalPost) return [];
    const createdAt = share.criadoEm ?? share.createdAt;
    if (!createdAt) return [];
    return [{
      ...share,
      tipo: 'partilha' as const,
      corpo: share.nota ?? '',
      createdAt,
      autor: share.actor,
      originalPost,
    }];
  });

  const all = [
    ...cursos.data.map((d) => ({ ...d, tipo: 'curso' as const })),
    ...simulacoes.data.map((d) => ({ ...d, tipo: 'simulacao' as const })),
    ...experiencias.data.map((d) => ({ ...d, tipo: 'experiencia' as const })),
    ...feedPosts.data.map((d) => ({ ...d, tipo: 'post' as const })),
    ...programas.data.map((d) => ({ ...d, tipo: 'programa' as const })),
    ...projetos.data.map((d) => ({ ...d, tipo: 'projeto' as const })),
    ...shares,
  ] as Array<StrapiEntity & { tipo: FeedItemTipo }>;

  return all.filter((c) => {
    if (c.tipo === 'post') return c.estado === 'aprovada';
    if (c.tipo === 'partilha') return true;
    const vis = c.visibilidade ?? 'publico';
    return isPublicCatalogEstado(c.estado) && vis === 'publico';
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
  const originalPost = c.originalPost;

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
    avatar: resolvePerfilAvatar(c.autor?.avatarUrl, c.autor?.foto),
    imagem: mediaUrls[0],
    mediaUrls,
    area: parsedArea.success ? parsedArea.data : undefined,
    autorNome: c.autor?.nome ?? c.autorNome ?? c.instituicaoNome ?? c.estudante?.nome,
    score,
    recencyScore,
    stats: {
      likes: stats.likes,
      comentarios: stats.comentarios,
      shares: stats.shares,
      ratingMedia: stats.ratingMedia,
      ratingTotal: stats.ratingTotal,
    },
    originalPost: originalPost ? {
      id: String(originalPost.id),
      titulo: titleFromContent({ ...originalPost, tipo: 'post' }),
      corpo: originalPost.corpo ?? originalPost.descricao,
      userId: String(originalPost.autor?.userId ?? originalPost.autorId ?? originalPost.autor?.id ?? originalPost.id),
      autorNome: originalPost.autor?.nome ?? originalPost.autorNome,
      avatar: resolvePerfilAvatar(originalPost.autor?.avatarUrl, originalPost.autor?.foto),
      mediaUrls: Array.isArray(originalPost.mediaUrls) ? originalPost.mediaUrls : [],
      createdAt: originalPost.createdAt,
    } : undefined,
  };
}

export function buildFeatures(
  stats: ItemStats,
  recency: number,
  affinityBoost = 0,
  authorReputation = 0
): FeedFeatures {
  const engagementWeights = {
    like: 2,
    comment: 3,
    share: 4,
    rating: 5,
  } as const;
  const engagementNormalizationCeiling = 100;
  const engagementNorm = Math.min(
    1,
    (
      stats.likes * engagementWeights.like
      + stats.comentarios * engagementWeights.comment
      + stats.shares * engagementWeights.share
      + stats.ratingTotal * engagementWeights.rating
    ) / engagementNormalizationCeiling,
  );
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
