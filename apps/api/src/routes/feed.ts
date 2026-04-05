import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getCookie } from 'hono/cookie';
import { jwtVerify } from 'jose';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { redis } from '../lib/redis.js';
import { calcRecencyScore, calcScore, type FeedFeatures } from '../modules/feed/feed.scoring.js';
import { getWeights, setWeights } from '../modules/feed/feed.weights.js';
import {
  FeedWeightsSchema,
  type FeedItem,
  type FeedItemTipo,
  type FeedResponse,
} from '@pdc/shared';

// ── Strapi interfaces ───────────────────────────────────────────────────────

interface StrapiEntity {
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

interface StrapiList<T> {
  data: T[];
  meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } };
}

interface StrapiUserProfile {
  areaInteresse?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode(
  process.env['JWT_SECRET'] ?? 'change-me-in-production-min-32-chars'
);

async function getOptionalUserId(c: Context): Promise<string | undefined> {
  try {
    const token = getCookie(c, 'access_token');
    if (!token) return undefined;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.sub as string;
  } catch {
    return undefined;
  }
}

interface ItemStats { likes: number; ratingMedia: number; ratingTotal: number }

async function getItemStats(tipo: FeedItemTipo, id: string): Promise<ItemStats> {
  // Per-entity stats cache (TTL 300s) — mitigates N+1
  const statsCacheKey = `feed:score:${tipo}:${id}`;
  if (redis) {
    const cached = await redis.get<ItemStats>(statsCacheKey);
    if (cached) return cached;
  }

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
    if (redis) {
      await redis.set(statsCacheKey, result, { ex: 300 });
    }
    return result;
  } catch {
    return { likes: 0, ratingMedia: 0, ratingTotal: 0 };
  }
}

async function fetchCandidates(): Promise<Array<StrapiEntity & { tipo: FeedItemTipo }>> {
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

const HYDRATION_CONCURRENCY = 10;

async function mapConcurrent<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

function toFeedItem(c: StrapiEntity & { tipo: FeedItemTipo }, stats: ItemStats, score: number, recencyScore: number): FeedItem {
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

// ── Query schemas ───────────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// ── Routes ──────────────────────────────────────────────────────────────────

export const feedRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /feed/trending — público
feedRoutes.get('/trending', zValidator('query', paginationSchema), async (c) => {
  const { page, limit } = c.req.valid('query');
  const cacheKey = `feed:trending:page:${String(page)}:limit:${String(limit)}`;

  if (redis) {
    const cached = await redis.get<FeedResponse>(cacheKey);
    if (cached) return c.json(cached);
  }

  const candidates = await fetchCandidates();
  const weights = await getWeights('trending');

  const scored = await mapConcurrent(
    candidates,
    async (cand) => {
      const stats = await getItemStats(cand.tipo, String(cand.id));
      const recency = calcRecencyScore(cand.publishedAt ?? cand.createdAt, cand.tipo);
      const engagementNorm = Math.min(1, (stats.likes * 2 + stats.ratingTotal * 5) / 100);
      const ratingNorm = stats.ratingMedia / 5;

      const features: FeedFeatures = {
        engagement: engagementNorm,
        completion: 0,
        rating: ratingNorm,
        recency,
        reputation: 0,
        affinity: 0,
        time: 0,
      };

      const score = calcScore(features, weights);
      return toFeedItem(cand, stats, score, recency);
    },
    HYDRATION_CONCURRENCY,
  );

  scored.sort((a, b) => b.score - a.score);
  const start = (page - 1) * limit;
  const paginated = scored.slice(start, start + limit);

  const response: FeedResponse = {
    data: paginated,
    meta: { page, pageSize: limit, hasMore: start + limit < scored.length },
  };

  if (redis) {
    await redis.set(cacheKey, response, { ex: 3600 });
  }

  return c.json(response);
});

// GET /feed/geral — requer auth
feedRoutes.get('/geral', verifyJwt, zValidator('query', paginationSchema), async (c) => {
  const user = c.get('user');
  const { page, limit } = c.req.valid('query');
  const cacheKey = `feed:geral:${user.id}:page:${String(page)}:limit:${String(limit)}`;

  if (redis) {
    const cached = await redis.get<FeedResponse>(cacheKey);
    if (cached) return c.json(cached);
  }

  // Perfil do utilizador para personalização
  let areaInteresse: string | undefined;
  try {
    const profile = await strapiGet<StrapiUserProfile>(`/users/${user.id}`);
    areaInteresse = profile.areaInteresse;
  } catch {
    // perfil pode não existir ainda
  }

  const candidates = await fetchCandidates();
  const weights = await getWeights('geral');

  // Filtrar já vistos
  let seenIds: Set<string> = new Set();
  if (redis) {
    const raw = await redis.smembers(`feed:seen:${user.id}`);
    seenIds = new Set(raw);
  }

  const unseen = candidates.filter(c => !seenIds.has(`${c.tipo}:${String(c.id)}`));

  const scored = await mapConcurrent(
    unseen,
    async (cand) => {
      const stats = await getItemStats(cand.tipo, String(cand.id));
      const recency = calcRecencyScore(cand.publishedAt ?? cand.createdAt, cand.tipo);
      const engagementNorm = Math.min(1, (stats.likes * 2 + stats.ratingTotal * 5) / 100);
      const ratingNorm = stats.ratingMedia / 5;
      const affinityBoost = (areaInteresse && cand.area === areaInteresse) ? 0.2 : 0;

      const features: FeedFeatures = {
        engagement: engagementNorm,
        completion: 0,
        rating: ratingNorm,
        recency,
        reputation: 0,
        affinity: affinityBoost,
        time: 0,
      };

      const score = calcScore(features, weights);
      return toFeedItem(cand, stats, score, recency);
    },
    HYDRATION_CONCURRENCY,
  );

  scored.sort((a, b) => b.score - a.score);
  const start = (page - 1) * limit;
  const paginated = scored.slice(start, start + limit);

  // Marcar como vistos (TTL 48h)
  if (redis && paginated.length > 0) {
    const first = paginated[0];
    if (first) {
      const ids: [string, ...string[]] = [`${first.tipo}:${first.id}`, ...paginated.slice(1).map(i => `${i.tipo}:${i.id}`)];
      await redis.sadd(`feed:seen:${user.id}`, ...ids);
      await redis.expire(`feed:seen:${user.id}`, 48 * 3600);
    }
  }

  // TODO: Invalidar cache quando o utilizador faz like/bookmark

  const response: FeedResponse = {
    data: paginated,
    meta: { page, pageSize: limit, hasMore: start + limit < scored.length },
  };

  if (redis) {
    await redis.set(cacheKey, response, { ex: 900 });
  }

  return c.json(response);
});

// Backwards-compatible: GET /feed (public, same as trending)
feedRoutes.get('/', zValidator('query', paginationSchema), async (c) => {
  const { page, limit } = c.req.valid('query');
  const userId = await getOptionalUserId(c);

  const cacheKey = `feed:general:${String(page)}:${String(limit)}`;

  if (redis) {
    const cached = await redis.get<FeedResponse>(cacheKey);
    if (cached) return c.json(cached);
  }

  const candidates = await fetchCandidates();
  const weights = await getWeights('geral');

  const scored = await mapConcurrent(
    candidates,
    async (cand) => {
      const stats = await getItemStats(cand.tipo, String(cand.id));
      const recency = calcRecencyScore(cand.publishedAt ?? cand.createdAt, cand.tipo);
      const engagementNorm = Math.min(1, (stats.likes * 2 + stats.ratingTotal * 5) / 100);
      const ratingNorm = stats.ratingMedia / 5;

      const features: FeedFeatures = {
        engagement: engagementNorm,
        completion: 0,
        rating: ratingNorm,
        recency,
        reputation: 0,
        affinity: 0,
        time: 0,
      };

      return toFeedItem(cand, stats, calcScore(features, weights), recency);
    },
    HYDRATION_CONCURRENCY,
  );

  scored.sort((a, b) => b.score - a.score);
  const start = (page - 1) * limit;
  const paginated = scored.slice(start, start + limit);

  const response: FeedResponse = {
    data: paginated,
    meta: { page, pageSize: limit, hasMore: start + limit < scored.length },
  };

  if (redis) {
    await redis.set(cacheKey, response, { ex: 900 });
  }

  // TODO: personalização futura baseada em userId
  void userId;

  return c.json(response);
});

// GET /feed/weights/:tipo — super_admin
feedRoutes.get('/weights/:tipo', verifyJwt, checkRole(['super_admin']), async (c) => {
  const tipo = c.req.param('tipo');
  if (tipo !== 'geral' && tipo !== 'trending') {
    return c.json({ error: 'Tipo inválido. Usa "geral" ou "trending".' }, 400);
  }
  const weights = await getWeights(tipo);
  return c.json(weights);
});

// PUT /feed/weights/:tipo — super_admin
feedRoutes.put('/weights/:tipo', verifyJwt, checkRole(['super_admin']), zValidator('json', FeedWeightsSchema), async (c) => {
  const tipo = c.req.param('tipo');
  if (tipo !== 'geral' && tipo !== 'trending') {
    return c.json({ error: 'Tipo inválido. Usa "geral" ou "trending".' }, 400);
  }
  const weights = c.req.valid('json');
  await setWeights(tipo, weights);

  // Invalidar cache do feed correspondente
  if (redis) {
    const r = redis;
    // Invalidar cache de feed (trending, geral, general backwards-compat)
    const prefixes = tipo === 'trending'
      ? ['feed:trending:']
      : ['feed:geral:', 'feed:general:'];
    for (const prefix of prefixes) {
      const keys = await r.keys(`${prefix}*`);
      if (keys.length > 0) {
        await Promise.all(keys.map(k => r.del(k)));
      }
    }
  }

  return c.json({ success: true });
});

