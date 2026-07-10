import pino from 'pino';
import { type ReputacaoBreakdown, type ReputacaoTier } from '@pdc/shared';
import { strapiGet, strapiPut } from '../strapi/strapi.client.js';
import { redis } from '../../lib/redis.js';
import * as featureFlagService from '../feature-flags/feature-flags.service.js';

const log = pino({ name: 'reputation' });

interface StrapiPerfilBasic {
  id: number;
  documentId?: string;
  nome: string;
  tipo: string;
  reputacao?: number;
  createdAt: string;
}

interface StrapiRating {
  id: string;
  nota: number;
}

const BATCH_SIZE = 25;
const RECALC_QUEUE_KEY = 'reputation:recalc_queue';

/**
 * Weights for reputation calculation.
 * Each dimension normalises to 0-1 then is weighted to sum ≤ 100.
 */
const WEIGHTS = {
  ratingsMedia: 25,      // Average rating received (0-5 → 0-1)
  cursosPublicados: 20,   // Number of published courses (capped at 10 → 0-1)
  simulacoes: 15,         // Number of simulations (capped at 20 → 0-1)
  conquistas: 20,         // Number of achievements (capped at 15 → 0-1)
  tempoPlataforma: 10,    // Time on platform in months (capped at 24 → 0-1)
  engagement: 10,         // Interactions created (comments, ratings given; capped at 50 → 0-1)
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Count items of a content-type filtered by a field.
 * Returns 0 on error (missing collection, etc).
 */
async function countItems(path: string, params?: Record<string, string>): Promise<number> {
  try {
    const res = await strapiGet<unknown>(path, {
      'pagination[pageSize]': '1',
      ...params,
    });
    return res.meta.pagination.total;
  } catch {
    return 0;
  }
}

/**
 * Average rating received for items authored by this profile.
 */
async function getAvgRating(perfilId: string): Promise<number> {
  try {
    const res = await strapiGet<StrapiRating>('/ratings', {
      'filters[perfilAlvo][$eq]': perfilId,
      'pagination[pageSize]': '100',
      'fields[0]': 'nota',
    });
    const ratings = res.data;
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.nota, 0);
    return sum / ratings.length;
  } catch {
    return 0;
  }
}

/**
 * Calculate reputation score (0-100) for a profile by aggregating metrics.
 * Invariant: returns 0 if profile not found.
 */
export async function calcularReputacao(perfilId: string): Promise<number> {
  // Parallel fetch all independent metrics
  const [
    avgRating,
    cursosCount,
    simCount,
    conquistas,
    comentarios,
    ratingsGiven,
    resPerfil,
  ] = await Promise.all([
    getAvgRating(perfilId),
    countItems('/cursos', { 'filters[autor][$eq]': perfilId }),
    countItems('/simulacoes', { 'filters[autor][$eq]': perfilId }),
    countItems('/conquistas', { 'filters[perfis][id][$eq]': perfilId }),
    countItems('/comments', { 'filters[autor][$eq]': perfilId }),
    countItems('/ratings', { 'filters[autor][$eq]': perfilId }),
    strapiGet<StrapiPerfilBasic>(`/perfis/${perfilId}`, {
      'fields[0]': 'createdAt',
    }),
  ]);

  const perfil = resPerfil.data[0];
  const tempoScore = (() => {
    if (!perfil) return 0;
    const created = new Date(perfil.createdAt);
    const months = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return clamp(months / 24, 0, 1);
  })();

  const ratingScore = clamp(avgRating / 5, 0, 1);
  const cursosScore = clamp(cursosCount / 10, 0, 1);
  const simScore = clamp(simCount / 20, 0, 1);
  const conquistasScore = clamp(conquistas / 15, 0, 1);
  const engagementScore = clamp((comentarios + ratingsGiven) / 50, 0, 1);

  // Weighted sum
  const raw =
    ratingScore * WEIGHTS.ratingsMedia +
    cursosScore * WEIGHTS.cursosPublicados +
    simScore * WEIGHTS.simulacoes +
    conquistasScore * WEIGHTS.conquistas +
    tempoScore * WEIGHTS.tempoPlataforma +
    engagementScore * WEIGHTS.engagement;

  return Math.round(clamp(raw, 0, 100));
}

/**
 * Calculate and persist reputation for a single profile.
 */
export async function persistirReputacao(perfilId: string): Promise<number> {
  const score = await calcularReputacao(perfilId);

  // Get documentId for Strapi v5 PUT
  const res = await strapiGet<StrapiPerfilBasic>(`/perfis/${perfilId}`, {
    'fields[0]': 'id',
    'fields[1]': 'documentId',
  });

  const perfil = res.data[0];
  const docId = perfil?.documentId || perfilId;
  await strapiPut(`/perfis/${docId}`, { reputacao: score });
  log.info({ perfilId, score }, 'Reputação persistida');

  return score;
}

/**
 * Mark a profile for async recalculation.
 */
export async function marcarParaRecalculo(perfilId: string, motivo: string): Promise<void> {
  try {
    await Promise.all([
      redis.sadd(RECALC_QUEUE_KEY, perfilId),
      redis.del(`reputation:${perfilId}`),
    ]);
  } catch (err) {
    log.warn({ err, perfilId }, 'Falha ao marcar perfil para recálculo de reputação');
    throw err;
  }
  log.info({ perfilId, motivo }, 'Perfil marcado para recálculo de reputação');
}

/**
 * Recalculate reputation for all profiles, in batches.
 * Returns the number of profiles updated.
 */
export async function recalcularGlobal(): Promise<{ updated: number; errors: number }> {
  let page = 1;
  let updated = 0;
  let errors = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await strapiGet<StrapiPerfilBasic>('/perfis', {
      'fields[0]': 'id',
      'fields[1]': 'documentId',
      'fields[2]': 'nome',
      'pagination[page]': String(page),
      'pagination[pageSize]': String(BATCH_SIZE),
    });

    const perfis = res.data;
    for (const perfil of perfis) {
      try {
        await persistirReputacao(String(perfil.id));
        updated++;
      } catch (err) {
        errors++;
        log.error({ perfilId: perfil.id, err }, 'Erro ao recalcular reputação');
      }
    }

    hasMore = page < res.meta.pagination.pageCount;
    page++;
  }

  return { updated, errors };
}

/**
 * Get the persisted reputation score for a profile.
 * Returns 0 if not found (invariant: absent = 0).
 */
export async function getReputacao(perfilId: string): Promise<number> {
  // Check feature flag
  try {
    const flags = await featureFlagService.getEffectiveFlags();
    if (!flags['REPUTATION_VISIBLE']) return 0;
  } catch {
    return 0; // flag service down → reputation hidden
  }

  const cacheKey = `reputation:${perfilId}`;
  const cached = await redis.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const res = await strapiGet<{ reputacao?: number }>(`/perfis/${perfilId}`, {
      'fields[0]': 'reputacao',
    });
    const score = res.data[0]?.reputacao ?? 0;
    await redis.set(cacheKey, score, { ex: 300 }); // cache 5 min
    return score;
  } catch {
    return 0;
  }
}

/**
 * Determine the tier based on numerical score (SSOT Logic).
 */
export function getTier(score: number): ReputacaoTier {
  if (score >= 90) return 'DIAMANTE';
  if (score >= 70) return 'OURO';
  if (score >= 40) return 'PRATA';
  return 'BRONZE';
}

/**
 * Get the full breakdown for a profile.
 * Non-cached (used for personal reputation page).
 */
export async function getReputacaoBreakdown(perfilId: string): Promise<ReputacaoBreakdown> {
  // 1. Check feature flag (R2.T6 Gate)
  const flags = await featureFlagService.getEffectiveFlags();
  if (!flags['REPUTATION_VISIBLE']) {
    const err = new Error('Reputação desativada') as Error & { status?: number };
    err.status = 404;
    throw err;
  }

  // Reutiliza a lógica do calcularReputacao mas retorna os valores crus
  const [
    avgRating,
    cursosCount,
    simCount,
    conquistas,
    comentarios,
    ratingsGiven,
    resPerfil,
  ] = await Promise.all([
    getAvgRating(perfilId),
    countItems('/cursos', { 'filters[autor][$eq]': perfilId }),
    countItems('/simulacoes', { 'filters[autor][$eq]': perfilId }),
    countItems('/conquistas', { 'filters[perfis][id][$eq]': perfilId }),
    countItems('/comments', { 'filters[autor][$eq]': perfilId }),
    countItems('/ratings', { 'filters[autor][$eq]': perfilId }),
    strapiGet<StrapiPerfilBasic>(`/perfis/${perfilId}`, {
      'fields[0]': 'createdAt',
    }),
  ]);

  const perfil = resPerfil.data[0];
  const tempoScore = (() => {
    if (!perfil) return 0;
    const created = new Date(perfil.createdAt);
    const months = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return clamp(months / 24, 0, 1);
  })();

  const ratingScore = clamp(avgRating / 5, 0, 1);
  const cursosScore = clamp(cursosCount / 10, 0, 1);
  const simScore = clamp(simCount / 20, 0, 1);
  const conquistasScore = clamp(conquistas / 15, 0, 1);
  const engagementScore = clamp((comentarios + ratingsGiven) / 50, 0, 1);

  const score = Math.round(
    clamp(
      ratingScore * WEIGHTS.ratingsMedia +
      cursosScore * WEIGHTS.cursosPublicados +
      simScore * WEIGHTS.simulacoes +
      conquistasScore * WEIGHTS.conquistas +
      tempoScore * WEIGHTS.tempoPlataforma +
      engagementScore * WEIGHTS.engagement,
      0, 100
    )
  );

  return {
    score,
    tier: getTier(score),
    dimensions: {
      ratingsMedia: Number(avgRating.toFixed(1)),
      cursosPublicados: cursosCount,
      simulacoes: simCount,
      conquistas,
      tempoPlataforma: Number((tempoScore * 24).toFixed(1)),
      engagement: comentarios + ratingsGiven,
    }
  };
}
