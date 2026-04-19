import { Hono } from 'hono';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { getItemStats, fetchCandidates, mapConcurrent, toFeedItem, buildFeatures, calcRecencyScore, calcScore, HYDRATION_CONCURRENCY } from './feed.helpers.js';
import type { FeedItem } from '@pdc/shared';

type Vars = { Variables: AuthVariables };
export const feedRoutes = new Hono<Vars>();

const DEFAULT_WEIGHTS = {
  engagement: 0.4,
  completion: 0.1,
  rating: 0.2,
  recency: 0.2,
  reputation: 0.1,
  affinity: 0.0,
  time: 0.0,
};

feedRoutes.get('/', verifyJwt, async (c) => {
  const user = c.get('user');

  try {
    // 1. Buscar perfil do usuário para boost de afinidade
    const resPerfil = await strapiGet<any>('/perfis', {
      'filters[userId][$eq]': user.id,
      'fields': 'areasInteresse',
    });
    const areaInteresse = resPerfil.data[0]?.areasInteresse?.[0] || '';

    // 2. Buscar candidatos (Simulações, Cursos, Experiências)
    const candidates = await fetchCandidates();

    // 3. Hidratação concorrente (Stats + Scoring)
    const items = await mapConcurrent(candidates, async (cand) => {
      const stats = await getItemStats(cand.tipo, String(cand.id));
      
      const affinityBoost = cand.area === areaInteresse ? 0.3 : 0;
      const recencyScore = calcRecencyScore(cand.publishedAt || cand.createdAt, cand.tipo);
      
      const features = buildFeatures(stats, recencyScore, affinityBoost, 0);
      const score = calcScore(features, DEFAULT_WEIGHTS);

      return toFeedItem(cand, stats, score, recencyScore);
    }, HYDRATION_CONCURRENCY);

    // 4. Ranking final
    const sorted = items.sort((a: FeedItem, b: FeedItem) => (b.score || 0) - (a.score || 0));

    return c.json({
      data: sorted.slice(0, 50),
      meta: { total: sorted.length }
    });
  } catch (err) {
    return c.json({ error: 'Erro ao processar feed' }, 502);
  }
});
