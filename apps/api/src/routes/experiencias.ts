import { Hono } from 'hono';
import pino from 'pino';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { CriarExperienciaPayloadSchema, TipoExperienciaSchema } from '@pdc/shared';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { requireApproved } from '../middleware/requireApproved.js';
import { rateLimitContentCreate } from '../middleware/rateLimit.js';
import {
  strapiGet,
  strapiPost,
  strapiPut,
  StrapiHttpError,
} from '../modules/strapi/strapi.client.js';
import { persistedEntityId } from '../modules/strapi/strapi-entity.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { requireInternalQaCreatorAccess } from '../modules/feature-flags/cor-0001-gates.js';
import {
  applyExperienceVariantFilter,
  filterVwxExperiences,
  isVwxCatalogEnabled,
} from '../modules/feature-flags/vwx-catalog-gate.js';
import {
  CONTENT_ACCESS_ERRORS,
  canPreviewContent,
} from '../modules/conteudo/content-access.service.js';
import {
  experienceDto,
  publicExperienceDto,
  findExperience,
  publicExperience,
  variantIssues,
  newExperienceSlug,
  type ExperienceRecord,
} from '../modules/experiencias/experience.service.js';
import { applyPublicCatalogStateFilter } from './publication-state.js';
import { toPaginatedResponse } from './pagination.js';
import { experienciaStatsRoutes } from './experiencias-stats.js';
import { experienciaEditorialRoutes } from './experiencias-editorial.js';
import { experienciaParticipationRoutes } from './experiencias-participation.js';
import { experienceWriteLock } from '../modules/experiencias/experience-write-lock.js';

const log = pino({ name: 'routes:experiencias' });
export const experienciaRoutes = new Hono<{ Variables: AuthVariables }>();
const creators = ['instituicao', 'mentor', 'super_admin'] as const;
const reviewers = ['comite_cientifico', 'moderador'] as const;
const query = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  tipoExperiencia: TipoExperienciaSchema.optional(),
});

experienciaRoutes.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  log.error({ err }, 'Falha no percurso da experiência');
  if (err instanceof StrapiHttpError && [400, 422].includes(err.status)) {
    const body = z.object({ error: z.object({ message: z.string() }) }).safeParse(err.body);
    return c.json(
      {
        error: body.success
          ? body.data.error.message
          : 'O conteúdo não cumpre os requisitos de validação.',
      },
      422
    );
  }
  if (err instanceof z.ZodError)
    return c.json(
      {
        error: 'Este conteúdo contém dados inválidos. Contacta o responsável pelo conteúdo.',
        code: 'CONTENT_INVALID',
      },
      422
    );
  return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
});

experienciaRoutes.get('/', zValidator('query', query), async (c) => {
  const q = c.req.valid('query');
  const params: Record<string, string | string[]> = {
    populate: 'instituicao',
    sort: 'createdAt:desc',
    'pagination[page]': String(q.page),
    'pagination[pageSize]': String(q.pageSize),
  };
  applyPublicCatalogStateFilter(params);
  await applyExperienceVariantFilter(params, q.tipoExperiencia);
  const res = await strapiGet<ExperienceRecord>('/experiencias', params);
  const visible = filterVwxExperiences(res.data, await isVwxCatalogEnabled());
  return c.json(toPaginatedResponse({ ...res, data: visible.map(publicExperienceDto) }));
});

experienciaRoutes.get(
  '/minhas',
  verifyJwt,
  checkRole([...creators]),
  zValidator('query', query),
  async (c) => {
    const user = c.get('user');
    const q = c.req.valid('query');
    const res = await strapiGet<ExperienceRecord>('/experiencias', {
      ...(user.role === 'super_admin' ? {} : { 'filters[autor][userId][$eq]': user.id }),
      status: 'draft',
      populate: 'autor,instituicao',
      sort: 'updatedAt:desc',
      'pagination[page]': String(q.page),
      'pagination[pageSize]': String(q.pageSize),
    });
    return c.json(toPaginatedResponse({ ...res, data: res.data.map(experienceDto) }));
  }
);

experienciaRoutes.get(
  '/minhas/:id',
  verifyJwt,
  checkRole([...creators, ...reviewers]),
  requireInternalQaCreatorAccess(),
  async (c) => {
    const existing = await findExperience(c.req.param('id'));
    if (!existing) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    if (
      !canPreviewContent({
        actor: c.get('user'),
        authorId: existing.autor?.userId,
        reviewerRoles: reviewers,
      })
    ) {
      return c.json({ error: 'Autoridade insuficiente' }, 403);
    }
    const published = await findExperience(c.req.param('id'), 'published');
    return c.json({
      ...experienceDto(existing),
      vwxValidacao: existing.vwxValidacao,
      motivoRejeicao: existing.motivoRejeicao,
      hasPublishedVersion: !!published && ['approved', 'published'].includes(published.estado),
    });
  }
);

experienciaRoutes.route('/', experienciaStatsRoutes);
experienciaRoutes.route('/', experienciaEditorialRoutes);
experienciaRoutes.route('/', experienciaParticipationRoutes);

experienciaRoutes.get('/:id', async (c) => {
  const experience = await publicExperience(c.req.param('id'));
  if (!experience) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
  return c.json(publicExperienceDto(experience));
});

experienciaRoutes.post(
  '/',
  verifyJwt,
  checkRole([...creators]),
  requireInternalQaCreatorAccess(),
  requireApproved(),
  rateLimitContentCreate,
  zValidator('json', CriarExperienciaPayloadSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');
    if (body.tipoExperiencia === 'vwx' && user.role !== 'super_admin') {
      return c.json({ error: 'A produção VWX é gerida pela equipa PDC.' }, 403);
    }
    const issues = variantIssues(body);
    if (issues.length) return c.json({ error: issues.join(' '), issues }, 422);
    const perfilId =
      user.perfilId ??
      (
        await strapiGet<{ id: string | number }>('/perfis', {
          'filters[userId][$eq]': user.id,
          'pagination[pageSize]': '1',
        })
      ).data[0]?.id;
    if (perfilId === undefined) return c.json({ error: 'Perfil do autor não encontrado' }, 404);
    const res = await strapiPost<ExperienceRecord>(
      '/experiencias',
      {
        ...body,
        tipoExperiencia: body.tipoExperiencia ?? 'institucional',
        autor: String(perfilId),
        ...(user.instituicaoId ? { instituicao: user.instituicaoId } : {}),
        estado: 'draft',
        gratuito: true,
        slug: newExperienceSlug(body.titulo),
      },
      { status: 'draft' }
    );
    const id = persistedEntityId(res.data);
    const event = await eventBus.publishWithOutbox(DomainEventName.EXPERIENCIA_CRIADA, {
      experienciaId: id,
      autorId: user.id,
      titulo: body.titulo,
      area: body.area,
    });
    return c.json({ id, eventId: event.id }, 201);
  }
);

experienciaRoutes.put(
  '/:id',
  verifyJwt,
  checkRole([...creators]),
  requireInternalQaCreatorAccess(),
  experienceWriteLock,
  zValidator('json', CriarExperienciaPayloadSchema.partial()),
  async (c) => {
    const existing = await findExperience(c.req.param('id'));
    if (!existing) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    const user = c.get('user');
    if (existing.autor?.userId !== user.id && user.role !== 'super_admin') {
      return c.json({ error: 'Autoridade insuficiente' }, 403);
    }
    if (existing.tipoExperiencia === 'vwx' && user.role !== 'super_admin') {
      return c.json({ error: 'A produção VWX é gerida pela equipa PDC.' }, 403);
    }
    const body = c.req.valid('json');
    if (
      body.tipoExperiencia &&
      body.tipoExperiencia !== (existing.tipoExperiencia ?? 'institucional')
    ) {
      return c.json({ error: 'O tipo de conteúdo não pode ser alterado depois da criação.' }, 409);
    }
    const merged = {
      ...existing,
      ...body,
      secoes: body.secoes ?? existing.secoes ?? [],
      vwx: body.vwx ?? existing.vwx ?? undefined,
    };
    const issues = variantIssues(merged);
    if (issues.length) return c.json({ error: issues.join(' '), issues }, 422);
    const res = await strapiPut<ExperienceRecord>(
      `/experiencias/${persistedEntityId(existing)}`,
      {
        ...body,
        estado: 'draft',
        vwxValidacao: null,
      },
      { status: 'draft' }
    );
    await eventBus.publishWithOutbox(DomainEventName.EXPERIENCIA_ATUALIZADA, {
      experienciaId: persistedEntityId(existing),
      autorId: user.id,
      titulo: merged.titulo,
    });
    return c.json(experienceDto(res.data));
  }
);
