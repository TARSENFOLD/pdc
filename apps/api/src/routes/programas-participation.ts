import { Hono } from 'hono';
import pino from 'pino';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import {
  StrapiHttpError,
  strapiDelete,
  strapiGet,
  strapiPost,
} from '../modules/strapi/strapi.client.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { toPaginatedResponse } from './pagination.js';
import type { StrapiProgramaRecord } from './programas.mapper.js';
import { findStrapiEntity, persistedEntityId } from '../modules/strapi/strapi-entity.js';
import {
  contentRelationIdentityFilters,
  loadContentVersions,
} from '../modules/conteudo/content-access.repository.js';
import {
  CONTENT_ACCESS_ERRORS,
  decideLearnerAccess,
  parseContentState,
} from '../modules/conteudo/content-access.service.js';
import {
  canManagePrograma,
  relationId,
  resolveProgramaActor,
} from './programas-access.js';

export const programaParticipationRoutes = new Hono<{ Variables: AuthVariables }>();
const log = pino({ name: 'routes:programas:participation' });
const PROGRAM_REVIEWER_ROLES = ['moderador'] as const;

interface StrapiInscricaoPrograma {
  id: string | number;
  documentId?: string;
  concluido?: boolean;
  dataConclusao?: string | null;
  programa?: {
    id: string | number;
    documentId?: string;
  };
}

class ProgramaParticipationRollbackError extends Error {
  readonly code = 'PROGRAM_PARTICIPATION_ROLLBACK_FAILED';

  constructor(
    message: string,
    readonly inscricaoId: string,
    readonly cause: unknown,
    readonly rollbackError: unknown,
  ) {
    super(message);
    this.name = 'ProgramaParticipationRollbackError';
  }
}

function inscricaoPersistedId(inscricao: StrapiInscricaoPrograma): string {
  return String(inscricao.documentId ?? inscricao.id);
}

function positivePageParam(value: string | undefined, fallback: number, maximum?: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return maximum === undefined ? parsed : Math.min(maximum, parsed);
}

async function retryCompensation(operation: () => Promise<unknown>): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await operation();
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

programaParticipationRoutes.get('/meus', verifyJwt, async (c) => {
  const { id: userId } = c.get('user');
  const page = positivePageParam(c.req.query('page'), 1);
  const pageSize = positivePageParam(c.req.query('pageSize'), 25, 50);
  try {
    const perfis = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    const perfilId = perfis.data[0]?.id;
    if (!perfilId) {
      return c.json(toPaginatedResponse({
        data: [],
        meta: { pagination: { page, pageSize, pageCount: 0, total: 0 } },
      }));
    }
    const response = await strapiGet<StrapiInscricaoPrograma>('/inscricoes-programas', {
      'filters[perfil][id][$eq]': perfilId,
      'pagination[page]': String(page),
      'pagination[pageSize]': String(pageSize),
      populate: 'programa.capa,programa.instituicao',
    });
    for (const enrollment of response.data) {
      const programaId = enrollment.programa ? persistedEntityId(enrollment.programa) : undefined;
      if (!programaId) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
      const versions = await loadContentVersions((status) => (
        findStrapiEntity<StrapiProgramaRecord>('programas', programaId, {
          status,
          populate: 'responsavel,instituicao',
        })
      ));
      const current = versions.current ?? versions.published;
      const decision = decideLearnerAccess({
        actor: c.get('user'),
        authorId: undefined,
        reviewerRoles: PROGRAM_REVIEWER_ROLES,
        currentState: parseContentState(current?.estado),
        publishedState: parseContentState(versions.published?.estado),
        hasPublishedVersion: versions.published !== undefined,
        relationExists: true,
        accessPolicy: 'granted',
      });
      if (decision === 'preview_only') return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
      if (decision === 'content_not_available') return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
      if (decision === 'content_not_found') return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    }
    return c.json(toPaginatedResponse(response));
  } catch (error) {
    log.error({ error, userId }, 'Falha ao carregar inscrições de Programa');
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

programaParticipationRoutes.post('/:id/inscricao', verifyJwt, async (c) => {
  const programaId = c.req.param('id');
  if (!programaId) return c.json({ error: 'Id é obrigatório' }, 400);
  const user = c.get('user');
  const { id: userId } = user;
  try {
    const actor = await resolveProgramaActor(user);
    if (!actor) return c.json({ error: 'Perfil não encontrado' }, 404);
    const perfilId = relationId(actor.perfil);
    const versions = await loadContentVersions((status) => (
      findStrapiEntity<StrapiProgramaRecord>('programas', programaId, {
        status,
        populate: 'responsavel,instituicao',
      })
    ));
    const current = versions.current ?? versions.published;
    const reference = current ?? versions.published;
    const existing = reference
      ? await strapiGet<StrapiInscricaoPrograma>('/inscricoes-programas', {
        'filters[perfil][id][$eq]': String(perfilId),
        ...contentRelationIdentityFilters('programa', persistedEntityId(reference)),
        'pagination[pageSize]': '1',
      })
      : undefined;
    const authorId = current && canManagePrograma(actor, current) ? user.id : undefined;
    const accessMode = versions.published?.modoAcesso ?? current?.modoAcesso;
    const decision = decideLearnerAccess({
      actor: user,
      authorId,
      reviewerRoles: PROGRAM_REVIEWER_ROLES,
      currentState: parseContentState(current?.estado),
      publishedState: parseContentState(versions.published?.estado),
      hasPublishedVersion: versions.published !== undefined,
      relationExists: existing !== undefined && existing.data.length > 0,
      accessPolicy: accessMode === 'livre' || accessMode === 'misto' ? 'open' : 'restricted',
    });
    if (decision === 'preview_only') return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
    if (decision === 'content_not_available') return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
    if (decision === 'content_not_found') return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    if (!versions.published) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    if (existing && existing.data.length > 0) return c.json({ error: 'Já inscrito neste programa' }, 409);

    const persistedProgramaId = persistedEntityId(versions.published);

    let created;
    try {
      created = await strapiPost<StrapiInscricaoPrograma>('/inscricoes-programas', {
        perfil: perfilId,
        programa: persistedProgramaId,
      });
    } catch (error) {
      if (error instanceof StrapiHttpError && error.status === 409) {
        return c.json({ error: 'Já inscrito neste programa' }, 409);
      }
      throw error;
    }
    try {
      await eventBus.publishWithOutbox(DomainEventName.PROGRAMA_INSCRICAO, {
        programaId: persistedProgramaId,
        estudanteId: userId,
      });
    } catch (eventError) {
      const inscricaoId = inscricaoPersistedId(created.data);
      try {
        await retryCompensation(() => strapiDelete(`/inscricoes-programas/${inscricaoId}`));
      } catch (rollbackError) {
        log.error({
          rollbackError,
          inscricaoId,
          rollbackType: 'enrollment_delete_failed',
        }, 'Rollback da inscrição falhou após erro no outbox');
        throw new ProgramaParticipationRollbackError(
          'Inscrição persistida sem evento após falha de rollback',
          inscricaoId,
          eventError,
          rollbackError,
        );
      }
      throw eventError;
    }
    return c.json({ id: inscricaoPersistedId(created.data) }, 201);
  } catch (error) {
    log.error({ error, programaId, userId }, 'Falha ao processar inscrição em Programa');
    if (error instanceof ProgramaParticipationRollbackError) {
      return c.json({ error: error.message, code: error.code }, 503);
    }
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

programaParticipationRoutes.post('/:id/concluir', verifyJwt, async (c) => {
  const programaId = c.req.param('id');
  if (!programaId) return c.json({ error: 'Id é obrigatório' }, 400);
  const user = c.get('user');
  const { id: userId } = user;
  try {
    const actor = await resolveProgramaActor(user);
    if (!actor) return c.json({ error: 'Perfil não encontrado' }, 404);
    const perfilId = relationId(actor.perfil);
    const versions = await loadContentVersions((status) => (
      findStrapiEntity<StrapiProgramaRecord>('programas', programaId, {
        status,
        populate: 'responsavel,instituicao',
      })
    ));
    const current = versions.current ?? versions.published;
    const reference = current ?? versions.published;
    const inscricoes = reference
      ? await strapiGet<StrapiInscricaoPrograma>('/inscricoes-programas', {
        'filters[perfil][id][$eq]': String(perfilId),
        ...contentRelationIdentityFilters('programa', persistedEntityId(reference)),
        'pagination[pageSize]': '1',
      })
      : undefined;
    const inscricao = inscricoes?.data[0];
    const authorId = current && canManagePrograma(actor, current) ? user.id : undefined;
    const decision = decideLearnerAccess({
      actor: user,
      authorId,
      reviewerRoles: PROGRAM_REVIEWER_ROLES,
      currentState: parseContentState(current?.estado),
      publishedState: parseContentState(versions.published?.estado),
      hasPublishedVersion: versions.published !== undefined,
      relationExists: inscricao !== undefined,
      accessPolicy: 'granted',
    });
    if (decision === 'preview_only') return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
    if (decision === 'content_not_available') return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
    if (decision === 'content_not_found') return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    if (!inscricao || !versions.published) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    const persistedProgramaId = persistedEntityId(versions.published);
    if (inscricao.concluido) return c.json({ success: true, alreadyCompleted: true });

    const persistedId = inscricaoPersistedId(inscricao);
    const completionTimestamp = new Date().toISOString();
    const transition = await strapiPost<{ updated: number }>(
      `/inscricoes-programas/${persistedId}/transicao-conclusao`,
      {
        action: 'complete',
        timestamp: completionTimestamp,
      },
    );
    if (transition.data.updated !== 1) {
      return c.json({ success: true, alreadyCompleted: true });
    }
    try {
      await eventBus.publishWithOutbox(DomainEventName.PROGRAMA_CONCLUIDO, {
        programaId: persistedProgramaId,
        perfilId: String(perfilId),
      });
    } catch (eventError) {
      try {
        await retryCompensation(async () => {
          const rollback = await strapiPost<{ updated: number }>(
            `/inscricoes-programas/${persistedId}/transicao-conclusao`,
            {
              action: 'revert',
              timestamp: completionTimestamp,
            },
          );
          if (rollback.data.updated !== 1) {
            throw new Error('A conclusão mudou antes da compensação');
          }
        });
      } catch (rollbackError) {
        log.error({
          rollbackError,
          inscricaoId: persistedId,
          rollbackType: 'completion_rollback_failed',
        }, 'Rollback da conclusão falhou após erro no outbox');
        throw new ProgramaParticipationRollbackError(
          'Conclusão persistida sem evento após falha de rollback',
          persistedId,
          eventError,
          rollbackError,
        );
      }
      throw eventError;
    }
    return c.json({ success: true });
  } catch (error) {
    log.error({ error, programaId, userId }, 'Falha ao concluir Programa');
    if (error instanceof ProgramaParticipationRollbackError) {
      return c.json({ error: error.message, code: error.code }, 503);
    }
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});
