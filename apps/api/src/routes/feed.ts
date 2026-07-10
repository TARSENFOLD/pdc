import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import pino from 'pino';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { getItemStats, fetchCandidates, mapConcurrent, toFeedItem, buildFeatures, calcRecencyScore, calcScore, HYDRATION_CONCURRENCY, type StrapiEntity } from './feed.helpers.js';
import { getWeights, setWeights } from '../modules/feed/feed.weights.js';
import { redis } from '../lib/redis.js';
import { AreaVocacionalSchema, UpdateFeedWeightsPayloadSchema } from '@pdc/shared';
import type { FeedItem, FeedWeights, FeedItemTipo, FeedSource } from '@pdc/shared';

type Vars = { Variables: AuthVariables };
export const feedRoutes = new Hono<Vars>();
const log = pino({ name: 'feed-routes' });

// ─── Shared feed pipeline ────────────────────────────────────────────────────

interface FeedEntryRecord {
  id: string | number;
  entityType?: FeedItemTipo;
  entityId?: string;
  autorId?: string;
  titulo?: string;
  corpo?: string;
  area?: string;
  source?: FeedSource;
  instituicaoId?: string;
  score?: number;
  eventId?: string;
  publicadoEm?: string;
  createdAt?: string;
}

function mapFeedEntry(entry: FeedEntryRecord): FeedItem | null {
  if (!entry.entityType || !entry.entityId || !entry.publicadoEm) return null;
  const parsedArea = AreaVocacionalSchema.safeParse(entry.area);
  return {
    id: entry.entityId,
    tipo: entry.entityType,
    titulo: entry.titulo ?? entry.entityType,
    corpo: entry.corpo,
    userId: entry.autorId ?? entry.entityId,
    createdAt: entry.publicadoEm,
    timestamp: entry.publicadoEm,
    area: parsedArea.success ? parsedArea.data : undefined,
    score: entry.score ?? 0,
    source: entry.source,
    metadata: {
      feedEntryId: String(entry.id),
      eventId: entry.eventId,
    },
  } satisfies FeedItem;
}

type FeedEntriesMeta = { total: number; fromFeedEntries: true; areaMatch?: string; instituicaoNome?: string };

async function readFeedEntries(
  source: FeedSource,
  area?: string,
  limit = 50,
  cacheScope?: string,
  extraMeta?: { areaMatch?: string; instituicaoNome?: string },
): Promise<{ data: FeedItem[]; meta: FeedEntriesMeta } | null> {
  const cacheKey = `feed:${source}:${cacheScope ?? area ?? 'all'}`;
  const cached = await redis.get<{ data: FeedItem[]; meta: FeedEntriesMeta }>(cacheKey).catch(() => null);
  if (cached) return cached;

  try {
    const params: Record<string, string> = {
      'filters[source][$eq]': source,
      sort: 'score:desc,publicadoEm:desc',
      'pagination[pageSize]': String(limit),
    };
    if (area) params['filters[area][$eq]'] = area;
    if (source === 'institucional' && cacheScope) params['filters[instituicaoId][$eq]'] = cacheScope;

    const res = await strapiGet<FeedEntryRecord>('/feed-entries', params);
    if (res.data.length === 0) return null;

    const data = res.data.flatMap((entry) => {
      const item = mapFeedEntry(entry);
      return item ? [item] : [];
    });
    if (data.length === 0) return null;
    const result = { data, meta: { total: data.length, fromFeedEntries: true as const, ...extraMeta } };
    await redis.set(cacheKey, result, { ex: 300 }).catch(() => undefined);
    return result;
  } catch (err) {
    log.warn({ err, source, area, cacheScope }, 'Falha ao ler feed-entries canónicas');
    return null;
  }
}

async function buildFeed(userId: string, weights: FeedWeights, limit = 50) {
  const resPerfil = await strapiGet<{ id: string | number; areasInteresse?: string[] }>('/perfis', {
    'filters[userId][$eq]': userId,
    'fields': 'areasInteresse',
  });
  const areaInteresse = resPerfil.data[0]?.areasInteresse?.[0] ?? undefined;

  const candidates = await fetchCandidates();

  const items = await mapConcurrent(candidates, async (cand) => {
    const stats = await getItemStats(cand.tipo, String(cand.id));
    const affinityBoost = cand.area === areaInteresse ? 0.3 : 0;
    const recencyScore = calcRecencyScore(cand.publishedAt || cand.createdAt, cand.tipo);
    const features = buildFeatures(stats, recencyScore, affinityBoost, 0);
    const score = calcScore(features, weights);
    return toFeedItem(cand, stats, score, recencyScore);
  }, HYDRATION_CONCURRENCY);

  const sorted = items.sort((a: FeedItem, b: FeedItem) => (b.score || 0) - (a.score || 0));
  return { data: sorted.slice(0, limit), meta: { total: sorted.length } };
}

// ─── GET / — Feed canónico (alias para /geral) ─────────────────────────────
// Nota: / e /geral são intencionalmente idênticos. A lógica real vive em buildFeed().

feedRoutes.get('/', verifyJwt, async (c) => {
  const user = c.get('user');
  try {
    const fromEntries = await readFeedEntries('geral');
    if (fromEntries) return c.json(fromEntries);
    return c.json(await buildFeed(user.id, await getWeights('geral')));
  } catch {
    return c.json({ error: 'Erro ao processar feed' }, 502);
  }
});

feedRoutes.get('/geral', verifyJwt, async (c) => {
  const user = c.get('user');
  try {
    const fromEntries = await readFeedEntries('geral');
    if (fromEntries) return c.json(fromEntries);
    return c.json(await buildFeed(user.id, await getWeights('geral')));
  } catch {
    return c.json({ error: 'Erro ao processar feed' }, 502);
  }
});

// ─── GET /trending — Feed trending (engagement-heavy) ───────────────────────

feedRoutes.get('/trending', verifyJwt, async (c) => {
  const user = c.get('user');
  try {
    const fromEntries = await readFeedEntries('trending');
    if (fromEntries) return c.json(fromEntries);
    const weights = await getWeights('trending');
    const result = await buildFeed(user.id, weights);
    return c.json(result);
  } catch {
    return c.json({ error: 'Erro ao processar feed trending' }, 502);
  }
});

// ─── GET /vocacional — Feed personalizado por área vocacional ────────────────
// Pré-requisito P1: requer perfil-vocacionais persistido com areaMatch.

feedRoutes.get('/vocacional', verifyJwt, async (c) => {
  const user = c.get('user');
  try {
    // 1. Buscar área vocacional do perfil persistido
    const resVoc = await strapiGet<{ areaMatch?: string }>('/perfil-vocacionais', {
      'filters[perfil][userId][$eq]': user.id,
      'filters[atual][$eq]': 'true',
      'sort': 'createdAt:desc',
      'pagination[pageSize]': '1',
    });
    const areaMatch = resVoc.data[0]?.areaMatch;

    if (!areaMatch) {
      // Sem perfil vocacional persistido — delega para feed geral
      const fromEntries = await readFeedEntries('geral');
      if (fromEntries) return c.json(fromEntries);
      return c.json(await buildFeed(user.id, await getWeights('geral')));
    }

    const fromEntries = await readFeedEntries('vocacional', areaMatch, 50, undefined, { areaMatch });
    if (fromEntries) return c.json(fromEntries);

    // 2. Filtrar candidatos pela área vocacional
    const candidates = await fetchCandidates();
    const filtered = candidates.filter((c) => c.area === areaMatch);
    const weights = await getWeights('geral');

    const items = await mapConcurrent(
      filtered,
      async (cand) => {
        const stats = await getItemStats(cand.tipo, String(cand.id));
        const recencyScore = calcRecencyScore(cand.publishedAt || cand.createdAt, cand.tipo);
        // Boost total para itens na área vocacional — feed é 100% personalizado
        const features = buildFeatures(stats, recencyScore, 0.5, 0);
        const score = calcScore(features, weights);
        return toFeedItem(cand, stats, score, recencyScore);
      },
      HYDRATION_CONCURRENCY,
    );

    const sorted = items.sort((a: FeedItem, b: FeedItem) => (b.score || 0) - (a.score || 0));
    return c.json({ data: sorted.slice(0, 50), meta: { total: sorted.length, areaMatch } });
  } catch {
    return c.json({ error: 'Erro ao processar feed vocacional' }, 502);
  }
});

// ─── GET /institucional — Feed da instituição do utilizador ──────────────────
// Mostra conteúdo publicado pela/para a instituição do utilizador.

feedRoutes.get('/institucional', verifyJwt, async (c) => {
  const user = c.get('user');
  try {
    // 1. Resolver instituição do utilizador (via perfil no Strapi)
    const resPerfil = await strapiGet<{ instituicao?: { id?: string | number; nome?: string } }>('/perfis', {
      'filters[userId][$eq]': user.id,
      'fields[0]': 'id',
      populate: 'instituicao',
    });
    const instituicao = resPerfil.data[0]?.instituicao;

    if (!instituicao?.nome) {
      // Utilizador sem instituição — delega para feed geral
      const fromEntries = await readFeedEntries('geral');
      if (fromEntries) return c.json(fromEntries);
      return c.json(await buildFeed(user.id, await getWeights('geral')));
    }

    const instituicaoNome = instituicao.nome;
    const instituicaoId = instituicao.id !== undefined ? String(instituicao.id) : instituicaoNome;
    const fromEntries = await readFeedEntries('institucional', undefined, 50, instituicaoId, { instituicaoNome });
    if (fromEntries) return c.json(fromEntries);

    // 2. Buscar experiências da instituição (principal tipo de conteúdo B2B)
    const [experiencias, feedPosts] = await Promise.all([
      strapiGet<StrapiEntity>('/experiencias', {
        'filters[instituicaoNome][$eq]': instituicaoNome,
        'pagination[pageSize]': '100',
        sort: 'publishedAt:desc',
        populate: 'instituicao',
      }),
      strapiGet<StrapiEntity>('/feed-posts', {
        'filters[estado][$eq]': 'aprovada',
        'filters[autor][instituicao][nome][$eq]': instituicaoNome,
        'pagination[pageSize]': '50',
        sort: 'createdAt:desc',
        populate: 'autor.foto',
      }),
    ]);

    const candidates: Array<StrapiEntity & { tipo: FeedItemTipo }> = [
      ...experiencias.data.map((d) => ({ ...d, tipo: 'experiencia' as const })),
      ...feedPosts.data.map((d) => ({ ...d, tipo: 'post' as const })),
    ];

    const weights = await getWeights('geral');
    const items = await mapConcurrent(
      candidates,
      async (cand) => {
        const stats = await getItemStats(cand.tipo, String(cand.id));
        const recencyScore = calcRecencyScore(cand.publishedAt || cand.createdAt, cand.tipo);
        const features = buildFeatures(stats, recencyScore, 0.4, 0);
        const score = calcScore(features, weights);
        return toFeedItem(cand, stats, score, recencyScore);
      },
      HYDRATION_CONCURRENCY,
    );

    const sorted = items.sort((a: FeedItem, b: FeedItem) => (b.score || 0) - (a.score || 0));
    return c.json({ data: sorted.slice(0, 50), meta: { total: sorted.length, instituicaoNome } });
  } catch {
    return c.json({ error: 'Erro ao processar feed institucional' }, 502);
  }
});

// ─── GET /weights/:tipo — Admin reads current weights ───────────────────────

feedRoutes.get('/weights/:tipo', verifyJwt, checkRole(['super_admin']), async (c) => {
  const tipo = c.req.param('tipo');
  if (tipo !== 'geral' && tipo !== 'trending') {
    return c.json({ error: 'Tipo inválido. Use "geral" ou "trending".' }, 400);
  }
  try {
    const weights = await getWeights(tipo);
    return c.json(weights);
  } catch {
    return c.json({ error: 'Erro ao obter pesos do feed' }, 502);
  }
});

// ─── PUT /weights/:tipo — Admin tunes weights ───────────────────────────────

feedRoutes.put('/weights/:tipo', verifyJwt, checkRole(['super_admin']), zValidator('json', UpdateFeedWeightsPayloadSchema), async (c) => {
  const tipo = c.req.param('tipo');
  if (tipo !== 'geral' && tipo !== 'trending') {
    return c.json({ error: 'Tipo inválido. Use "geral" ou "trending".' }, 400);
  }
  try {
    const { weights } = c.req.valid('json');
    await setWeights(tipo, weights);
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Erro ao gravar pesos do feed' }, 502);
  }
});
