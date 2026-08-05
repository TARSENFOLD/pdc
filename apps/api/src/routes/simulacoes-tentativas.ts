import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import pino from 'pino';
import { type Tentativa, analyzeFluidity, analyzeFocus } from '@pdc/shared';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import type { AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { persistedEntityId } from '../modules/strapi/strapi-entity.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { loadSimulacaoVersions } from '../modules/simulacoes/simulacao-access.repository.js';
import { contentRelationIdentityFilters } from '../modules/conteudo/content-access.repository.js';
import {
  CONTENT_ACCESS_ERRORS,
  decideLearnerAccess,
  parseContentState,
} from '../modules/conteudo/content-access.service.js';

const log = pino({ name: 'routes:simulacoes:tentativas' });
type Vars = { Variables: AuthVariables };

interface StrapiTentativaAccess {
  id: string | number;
  documentId?: string;
  simulacao?: {
    id: string | number;
    documentId?: string;
  };
}

const iniciarSchema = z.object({
  simulacaoId: z.string().min(1),
});

const concluirSchema = z.object({
  metadata: z.record(z.unknown()).optional(),
});

function parsePositiveDuration(metadata: Record<string, unknown> | undefined): number | null {
  const provided = Number(metadata?.['duracaoSegundos']);
  if (Number.isFinite(provided) && provided > 0) {
    return Math.floor(provided);
  }

  const dataInicio = typeof metadata?.['dataInicio'] === 'string' ? metadata['dataInicio'] : undefined;
  const dataFim = typeof metadata?.['dataFim'] === 'string' ? metadata['dataFim'] : undefined;
  if (!dataInicio || !dataFim) return null;

  const inicioMs = Date.parse(dataInicio);
  const fimMs = Date.parse(dataFim);
  if (!Number.isFinite(inicioMs) || !Number.isFinite(fimMs) || fimMs <= inicioMs) {
    return null;
  }

  return Math.max(1, Math.floor((fimMs - inicioMs) / 1000));
}

function parsePercentMetric(value: unknown, fallback: number): number {
  const parsed = Number(value);
  const raw = Number.isNaN(parsed) ? fallback : parsed;
  return Math.max(0, Math.min(100, raw));
}

export const simulacaoTentativasRoutes = new Hono<Vars>();
const SIMULATION_REVIEWER_ROLES = ['comite_cientifico', 'moderador'] as const;

// POST /simulacoes/tentativas — iniciar tentativa (estudante apenas)
simulacaoTentativasRoutes.post('/', checkRole(['estudante']), zValidator('json', iniciarSchema), async (c) => {
  const { id: userId } = c.get('user');
  const { simulacaoId } = c.req.valid('json');
  try {
    const [resPerfil, versions] = await Promise.all([
      strapiGet<{ id: string | number }>('/perfis', {
        'filters[userId][$eq]': userId,
        'fields[0]': 'id',
      }),
      loadSimulacaoVersions(simulacaoId),
    ]);
    const perfilId = resPerfil.data[0]?.id;
    if (!perfilId) return c.json({ error: 'Perfil não encontrado' }, 404);
    const perfilPublicId = String(perfilId);
    const current = versions.current ?? versions.published;
    const reference = current ?? versions.published;
    const prevTentativas = reference
      ? await strapiGet<Tentativa>('/tentativas', {
        'filters[perfil][id][$eq]': perfilPublicId,
        ...contentRelationIdentityFilters('simulacao', persistedEntityId(reference)),
      })
      : undefined;
    const decision = decideLearnerAccess({
      actor: c.get('user'),
      authorId: current?.autorId,
      reviewerRoles: SIMULATION_REVIEWER_ROLES,
      currentState: parseContentState(current?.estado),
      publishedState: parseContentState(versions.published?.estado),
      hasPublishedVersion: versions.published !== undefined,
      relationExists: prevTentativas !== undefined && prevTentativas.data.length > 0,
      accessPolicy: 'open',
    });
    if (decision === 'preview_only') return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
    if (decision === 'content_not_available') return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
    if (decision === 'content_not_found') return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    const sim = versions.published;
    if (!sim || !prevTentativas) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);

    const persistedSimulacaoId = persistedEntityId(sim);
    const tentativaNum = prevTentativas.meta.pagination.total + 1;

    const resPost = await strapiPost<Tentativa>('/tentativas', {
      simulacao: persistedSimulacaoId,
      perfil: perfilId,
      dataInicio: new Date().toISOString(),
      tentativaNum,
      executorTipo: `tipo${sim.tipo.toString()}`,
      status: 'em_progresso',
      metadata: { perfilId: perfilPublicId, userId, simulacaoId: persistedSimulacaoId },
    });

    const tentativaPublicId = persistedEntityId(resPost.data);

    await eventBus.publishWithOutbox(DomainEventName.TENTATIVA_INICIADA, {
      tentativaId: tentativaPublicId,
      perfilId: perfilPublicId,
    });

    return c.json({ ...resPost.data, id: tentativaPublicId }, 201);
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

// PUT /simulacoes/tentativas/:id — concluir tentativa (estudante apenas)
simulacaoTentativasRoutes.put('/:id', checkRole(['estudante']), zValidator('json', concluirSchema), async (c) => {
  const tentativaId = c.req.param('id');
  const user = c.get('user');
  const { metadata } = c.req.valid('json');
  const duracaoSegundos = parsePositiveDuration(metadata);
  if (duracaoSegundos === null) {
    return c.json({ error: 'duracaoSegundos deve ser positivo ou derivável de dataInicio/dataFim' }, 400);
  }

  try {
    const tentativaIdentityFilters: Record<string, string> = {
      'filters[$or][0][documentId][$eq]': tentativaId,
      ...(/^\d+$/.test(tentativaId) ? { 'filters[$or][1][id][$eq]': tentativaId } : {}),
    };
    const tentativaResponse = await strapiGet<StrapiTentativaAccess>('/tentativas', {
      ...tentativaIdentityFilters,
      'filters[perfil][userId][$eq]': user.id,
      populate: 'simulacao',
      'pagination[pageSize]': '1',
    });
    const tentativa = tentativaResponse.data[0];
    const simulacaoIdentifier = tentativa?.simulacao?.documentId
      ?? (tentativa?.simulacao?.id === undefined ? undefined : String(tentativa.simulacao.id));
    if (!tentativa || !simulacaoIdentifier) {
      return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    }
    const versions = await loadSimulacaoVersions(simulacaoIdentifier);
    const current = versions.current ?? versions.published;
    const decision = decideLearnerAccess({
      actor: user,
      authorId: current?.autorId,
      reviewerRoles: SIMULATION_REVIEWER_ROLES,
      currentState: parseContentState(current?.estado),
      publishedState: parseContentState(versions.published?.estado),
      hasPublishedVersion: versions.published !== undefined,
      relationExists: true,
      accessPolicy: 'granted',
    });
    if (decision === 'preview_only') return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
    if (decision === 'content_not_available') return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
    if (decision === 'content_not_found') return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);

    const focusStability = parsePercentMetric(metadata?.focusStability, 50);
    const fluidityStability = parsePercentMetric(
      metadata?.fluidityStability ?? metadata?.cognitiveFluidity ?? metadata?.phi,
      focusStability,
    );
    const focusPhi = focusStability / 100;
    const fluidityPhi = fluidityStability / 100;
    const resFluidity = analyzeFluidity(fluidityPhi);
    const resFocus = analyzeFocus(focusPhi);
    const finalScore = (resFluidity.score + resFocus.score) / 2;
    const tentativaPublicId = persistedEntityId(tentativa);
    log.info({ tentativaId: tentativaPublicId, finalScore, fluidityPhi, focusPhi }, 'Score Soberano derivado no BFF');

    const resPut = await strapiPut<Tentativa>(`/tentativas/${tentativaPublicId}`, {
      score: finalScore,
      metadata,
      status: 'concluida',
      dataFim: new Date().toISOString(),
      duracaoSegundos,
    });

    const area = typeof metadata?.domainId === 'string' ? metadata.domainId : 'geral';
    const metadataPerfilId = typeof metadata?.perfilId === 'string' ? metadata.perfilId : undefined;
    const resPerfil = await strapiGet<{ id: string | number }>('/perfis', {
      'filters[userId][$eq]': user.id,
      'fields[0]': 'id',
    });
    const perfilIdReal = metadataPerfilId ?? resPerfil.data[0]?.id;

    if (perfilIdReal) {
      await eventBus.publishWithOutbox(DomainEventName.TENTATIVA_CONCLUIDA, {
        tentativaId: tentativaPublicId,
        score: finalScore || 0,
        perfilId: String(perfilIdReal),
        area,
      });
    } else {
      log.warn({ tentativaId: tentativaPublicId, userId: user.id }, 'Perfil ausente — TENTATIVA_CONCLUIDA não publicada');
    }

    return c.json({ ...resPut.data, id: persistedEntityId(resPut.data) });
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});
