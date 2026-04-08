import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { redis } from '../lib/redis.js';
import { getWeights, setWeights } from '../modules/feed/feed.weights.js';
import { FeedWeightsSchema, type FeedResponse } from '@pdc/shared';
import {
  getItemStats,
  fetchCandidates,
  mapConcurrent,
  toFeedItem,
  buildFeatures,
  calcRecencyScore,
  calcScore,
  paginationSchema,
  HYDRATION_CONCURRENCY,
  type StrapiUserProfile,
} from './feed.helpers.js';
import { getReputacao } from '../modules/reputation/reputation.service.js';

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
      const rep = cand.autorId ? await getReputacao(cand.autorId) : 0;
      const features = buildFeatures(stats, recency, 0, rep);
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

  let areaInteresse: string | undefined;
  try {
    const profile = await strapiGet<StrapiUserProfile>(`/users/${user.id}`);
    areaInteresse = profile.areaInteresse;
  } catch { /* perfil pode não existir ainda */ }

  const candidates = await fetchCandidates();
  const weights = await getWeights('geral');

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
      const affinityBoost = (areaInteresse && cand.area === areaInteresse) ? 0.2 : 0;
      const rep = cand.autorId ? await getReputacao(cand.autorId) : 0;
      const features = buildFeatures(stats, recency, affinityBoost, rep);
      const score = calcScore(features, weights);
      return toFeedItem(cand, stats, score, recency);
    },
    HYDRATION_CONCURRENCY,
  );

  scored.sort((a, b) => b.score - a.score);
  const start = (page - 1) * limit;
  const paginated = scored.slice(start, start + limit);

  if (redis && paginated.length > 0) {
    const first = paginated[0];
    if (first) {
      const ids: [string, ...string[]] = [`${first.tipo}:${first.id}`, ...paginated.slice(1).map(i => `${i.tipo}:${i.id}`)];
      await redis.sadd(`feed:seen:${user.id}`, ...ids);
      await redis.expire(`feed:seen:${user.id}`, 48 * 3600);
    }
  }

  const response: FeedResponse = {
    data: paginated,
    meta: { page, pageSize: limit, hasMore: start + limit < scored.length },
  };

  if (redis) {
    await redis.set(cacheKey, response, { ex: 900 });
  }

  return c.json(response);
});

// Backwards-compatible: GET /feed → same as /trending
feedRoutes.get('/', async (c) => {
  const url = new URL(c.req.url);
  url.pathname = url.pathname.replace(/\/?$/, '/trending');
  return c.redirect(url.toString(), 307);
});

// GET /feed/vocacional — requer auth, filtra por área do perfil vocacional
feedRoutes.get('/vocacional', verifyJwt, zValidator('query', paginationSchema), async (c) => {
  const user = c.get('user');
  const { page, limit } = c.req.valid('query');
  const cacheKey = `feed:vocacional:${user.id}:page:${String(page)}:limit:${String(limit)}`;

  if (redis) {
    const cached = await redis.get<FeedResponse>(cacheKey);
    if (cached) return c.json(cached);
  }

  let areaInteresse: string | undefined;
  try {
    const profile = await strapiGet<StrapiUserProfile>(`/users/${user.id}`);
    areaInteresse = profile.areaInteresse;
  } catch { /* perfil pode não existir ainda */ }

  const candidates = await fetchCandidates();
  const weights = await getWeights('geral');

  // Boost items matching vocacional area
  const scored = await mapConcurrent(
    candidates,
    async (cand) => {
      const stats = await getItemStats(cand.tipo, String(cand.id));
      const recency = calcRecencyScore(cand.publishedAt ?? cand.createdAt, cand.tipo);
      const affinityBoost = (areaInteresse && cand.area === areaInteresse) ? 0.5 : 0;
      const features = buildFeatures(stats, recency, affinityBoost);
      const score = calcScore(features, weights);
      return toFeedItem(cand, stats, score, recency);
    },
    HYDRATION_CONCURRENCY,
  );

  // Sort by score; items matching area appear first due to higher affinity boost
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

  return c.json(response);
});

// GET /feed/institucional — público, filtra conteúdo de instituições (experiências)
feedRoutes.get('/institucional', zValidator('query', paginationSchema), async (c) => {
  const { page, limit } = c.req.valid('query');
  const cacheKey = `feed:institucional:page:${String(page)}:limit:${String(limit)}`;

  if (redis) {
    const cached = await redis.get<FeedResponse>(cacheKey);
    if (cached) return c.json(cached);
  }

  const candidates = await fetchCandidates();
  const weights = await getWeights('trending');

  // Filter to experiências (institution-created content)
  const institucional = candidates.filter((c) => c.tipo === 'experiencia');

  const scored = await mapConcurrent(
    institucional,
    async (cand) => {
      const stats = await getItemStats(cand.tipo, String(cand.id));
      const recency = calcRecencyScore(cand.publishedAt ?? cand.createdAt, cand.tipo);
      const features = buildFeatures(stats, recency);
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

  if (redis) {
    const r = redis;
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

