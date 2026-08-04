import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { cursosService } from '../modules/cursos/cursos.service.js';
import { loadSimulacaoVersions } from '../modules/simulacoes/simulacao-access.repository.js';
import { findStrapiEntity } from '../modules/strapi/strapi-entity.js';
import { loadContentVersions, type ContentVersions } from '../modules/conteudo/content-access.repository.js';
import {
  CONTENT_ACCESS_ERRORS,
  decideLearnerAccess,
  parseContentState,
  type ContentAccessActor,
  type LearnerAccessDecision,
} from '../modules/conteudo/content-access.service.js';

type Vars = { Variables: AuthVariables };
export const ratingRoutes = new Hono<Vars>();

ratingRoutes.use('*', verifyJwt);

interface StrapiRating {
  id: string;
  documentId?: string;
  userId?: string;
  valor?: number;
  estrelas?: number;
  actor?: { id?: string | number; userId?: string };
}

interface StrapiInscricao {
  id: string;
  progressoPercentual?: number;
  progressoPercentagem?: number;
}

const ELIGIBILITY_MIN_PROGRESS = 30;
const RATING_REVIEWER_ROLES = ['comite_cientifico', 'moderador'] as const;

interface RatingContentAccessRecord {
  estado: string;
  authorId: string | undefined;
}

interface RatingExperienceAccessRecord {
  id: string | number;
  estado: string;
  autor?: { userId?: string };
}

function mapRatingContentVersions<T extends { estado: string; autorId?: string }>(
  versions: ContentVersions<T>,
): ContentVersions<RatingContentAccessRecord> {
  return {
    ...(versions.current ? {
      current: { estado: versions.current.estado, authorId: versions.current.autorId },
    } : {}),
    ...(versions.published ? {
      published: { estado: versions.published.estado, authorId: versions.published.autorId },
    } : {}),
  };
}

async function loadRatingContentVersions(
  targetType: 'curso' | 'simulacao' | 'experiencia',
  targetId: string,
): Promise<ContentVersions<RatingContentAccessRecord>> {
  if (targetType === 'curso') {
    return mapRatingContentVersions(await cursosService.obterVersoesCurso(targetId));
  }
  if (targetType === 'simulacao') {
    return mapRatingContentVersions(await loadSimulacaoVersions(targetId));
  }
  const versions = await loadContentVersions((status) => (
    findStrapiEntity<RatingExperienceAccessRecord>('experiencias', targetId, {
      status,
      populate: 'autor',
    })
  ));
  return {
    ...(versions.current ? {
      current: {
        estado: versions.current.estado,
        authorId: versions.current.autor?.userId,
      },
    } : {}),
    ...(versions.published ? {
      published: {
        estado: versions.published.estado,
        authorId: versions.published.autor?.userId,
      },
    } : {}),
  };
}

async function ratingContentDecision(
  actor: ContentAccessActor,
  targetType: 'curso' | 'simulacao' | 'mentor' | 'experiencia',
  targetId: string,
): Promise<LearnerAccessDecision> {
  if (targetType === 'mentor') return 'allow';
  const versions = await loadRatingContentVersions(targetType, targetId);
  const current = versions.current ?? versions.published;
  return decideLearnerAccess({
    actor,
    authorId: current?.authorId,
    reviewerRoles: RATING_REVIEWER_ROLES,
    currentState: parseContentState(current?.estado),
    publishedState: parseContentState(versions.published?.estado),
    hasPublishedVersion: versions.published !== undefined,
    relationExists: false,
    accessPolicy: 'open',
  });
}

function ratingAccessError(c: Context, decision: LearnerAccessDecision) {
  if (decision === 'preview_only') return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
  if (decision === 'content_not_available') return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
  if (decision === 'content_not_found') return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
  return undefined;
}

async function resolvePerfilId(userId: string): Promise<string | undefined> {
  const resPerfil = await strapiGet<{ id: string | number }>('/perfis', {
    'filters[userId][$eq]': userId,
    'fields[0]': 'id',
    'pagination[limit]': '1',
  });
  const perfilId = resPerfil.data[0]?.id;
  return perfilId === undefined ? undefined : String(perfilId);
}

function ratingValue(rating: StrapiRating): number {
  return rating.estrelas ?? rating.valor ?? 0;
}

async function checkRatingEligibility(
  userId: string,
  targetType: 'curso' | 'simulacao' | 'mentor' | 'experiencia',
  targetId: string
): Promise<boolean> {
  // Mentors and experiencias are always rateable (no progress gating)
  if (targetType === 'mentor' || targetType === 'experiencia') return true;

  const strapiCollection = targetType === 'curso' ? '/inscricoes' : '/simulacoes';
  const filterKey = targetType === 'curso' ? 'filters[curso][id][$eq]' : 'filters[id][$eq]';
  const filterVal = targetType === 'curso' ? targetId : targetId;

  const res = await strapiGet<StrapiInscricao>(strapiCollection, {
    'filters[perfil][userId][$eq]': userId,
    [filterKey]: filterVal,
    'fields[0]': 'progressoPercentual',
    'pagination[limit]': '1',
  });

  const record = res.data[0];
  return (record?.progressoPercentual ?? record?.progressoPercentagem ?? 0) >= ELIGIBILITY_MIN_PROGRESS;
}

// POST /ratings
ratingRoutes.post('/', zValidator('json', z.object({
  targetType: z.enum(['curso', 'simulacao', 'mentor', 'experiencia']),
  targetId: z.string(),
  valor: z.number().min(1).max(5),
})), async (c) => {
  const { id: userId } = c.get('user');
  const { targetType, targetId, valor } = c.req.valid('json');

  try {
    const accessError = ratingAccessError(
      c,
      await ratingContentDecision(c.get('user'), targetType, targetId),
    );
    if (accessError) return accessError;
    const eligible = await checkRatingEligibility(userId, targetType, targetId);
    if (!eligible) {
      return c.json({ error: `Completa pelo menos ${String(ELIGIBILITY_MIN_PROGRESS)}% para poder avaliar` }, 403);
    }

    const perfilId = await resolvePerfilId(userId);
    if (!perfilId) return c.json({ error: 'Perfil não encontrado' }, 404);

    const res = await strapiGet<StrapiRating>('/ratings', {
      'filters[actor][id][$eq]': perfilId,
      'filters[targetType][$eq]': targetType,
      'filters[targetId][$eq]': targetId,
      'pagination[limit]': '1',
    });

    if (res.data.length > 0) {
      const idToUpdate = res.data[0]?.documentId ?? res.data[0]?.id;
      await strapiPut(`/ratings/${String(idToUpdate)}`, { estrelas: valor, editadoEm: new Date().toISOString() });
      return c.json({ success: true, action: 'updated' });
    }

    await strapiPost<{ id: string | number }>('/ratings', {
      actor: perfilId,
      targetType,
      targetId,
      estrelas: valor,
      criadoEm: new Date().toISOString(),
    });

    // G15: Impacto no Ecossistema
    await eventBus.publishWithOutbox(DomainEventName.RATING_CRIADO, {
      autorId: userId,
      targetType,
      targetId,
      score: valor
    });

    return c.json({ success: true, action: 'created' }, 201);
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

// GET /ratings/stats
ratingRoutes.get('/stats', zValidator('query', z.object({
  targetType: z.enum(['curso', 'simulacao', 'mentor', 'experiencia']),
  targetId: z.string(),
})), async (c) => {
  const { targetType, targetId } = c.req.valid('query');
  const userId = c.get('user').id;

  try {
    const accessError = ratingAccessError(
      c,
      await ratingContentDecision(c.get('user'), targetType, targetId),
    );
    if (accessError) return accessError;
    const res = await strapiGet<StrapiRating>('/ratings', {
      'filters[targetType][$eq]': targetType,
      'filters[targetId][$eq]': targetId,
      'populate[actor][fields][0]': 'userId',
      'pagination[limit]': '1000',
    });

    const ratings = res.data;
    let soma = 0;
    let userRating = 0;

    ratings.forEach(r => {
      const value = ratingValue(r);
      soma += value;
      if (userId && (r.userId === userId || r.actor?.userId === userId)) {
        userRating = value;
      }
    });

    return c.json({
      media: ratings.length > 0 ? Number((soma / ratings.length).toFixed(1)) : 0,
      total: ratings.length,
      userRating: userRating || null,
    });
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});
