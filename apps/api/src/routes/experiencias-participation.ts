import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  ParticipacaoExperienciaSchema,
  ProgressoExperienciaPayloadSchema,
  VWX_SECTION_TYPES,
  type ParticipacaoExperiencia,
} from '@pdc/shared';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import {
  publicExperience,
  findExperience,
  experienceDto,
} from '../modules/experiencias/experience.service.js';
import { persistedEntityId } from '../modules/strapi/strapi-entity.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { contentRelationIdentityFilters } from '../modules/conteudo/content-access.repository.js';
import {
  CONTENT_ACCESS_ERRORS,
  decideLearnerAccess,
  parseContentState,
} from '../modules/conteudo/content-access.service.js';
import {
  canExposeExperience,
  isVwxCatalogEnabled,
} from '../modules/feature-flags/vwx-catalog-gate.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { acquireLock } from '../lib/distributed-lock.js';

export const experienciaParticipationRoutes = new Hono<{ Variables: AuthVariables }>();
type ParticipationRecord = Partial<Omit<ParticipacaoExperiencia, 'id'>> & {
  id: string | number;
  documentId?: string;
};
async function findParticipation(id: string, userId: string) {
  return (
    await strapiGet<ParticipationRecord>('/experiencia-participantes', {
      'filters[estudanteId][$eq]': userId,
      ...contentRelationIdentityFilters('experiencia', id),
      'pagination[pageSize]': '1',
    })
  ).data[0];
}
function dto(record: ParticipationRecord) {
  return ParticipacaoExperienciaSchema.parse({
    ...record,
    id: persistedEntityId(record),
    secoesConcluidas: record.secoesConcluidas ?? [],
    entrega: record.entrega ?? '',
    reflexao: record.reflexao ?? '',
  });
}
const learners = ['estudante', 'mentor', 'instituicao', 'super_admin'] as const;

experienciaParticipationRoutes.get(
  '/:id/participacao',
  verifyJwt,
  checkRole([...learners]),
  async (c) => {
    const experience = await publicExperience(c.req.param('id') ?? '');
    if (!experience) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    const participation = await findParticipation(persistedEntityId(experience), c.get('user').id);
    return c.json({
      participacao: participation ? dto(participation) : null,
      experiencia: participation ? experienceDto(experience) : undefined,
    });
  }
);

experienciaParticipationRoutes.post(
  '/:id/inscrever',
  verifyJwt,
  checkRole([...learners]),
  async (c) => {
    const identifier = c.req.param('id') ?? '';
    const [current, published] = await Promise.all([
      findExperience(identifier),
      findExperience(identifier, 'published'),
    ]);
    const reference = current ?? published;
    const userId = c.get('user').id;
    const previous = reference
      ? await findParticipation(persistedEntityId(reference), userId)
      : undefined;
    const decision = decideLearnerAccess({
      actor: c.get('user'),
      authorId: current?.autor?.userId,
      reviewerRoles: ['comite_cientifico', 'moderador'],
      currentState: parseContentState(current?.estado),
      publishedState: parseContentState(published?.estado),
      hasPublishedVersion: !!published,
      relationExists: !!previous,
      accessPolicy: 'open',
    });
    if (decision === 'preview_only') return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
    if (decision === 'content_not_available')
      return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
    if (
      decision === 'content_not_found' ||
      !published ||
      !canExposeExperience(published, await isVwxCatalogEnabled())
    ) {
      return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    }
    if (previous) return c.json(dto(previous));
    const id = persistedEntityId(published);
    const lock = await acquireLock(`experiencia:participacao:${id}:${userId}`, 60000);
    if (!lock) return c.json({ error: 'Participação em processamento. Tenta novamente.' }, 409);
    try {
      const existing = await findParticipation(id, userId);
      if (existing) return c.json(dto(existing));
      const res = await strapiPost<ParticipationRecord>('/experiencia-participantes', {
        estudanteId: userId,
        experiencia: id,
        secoesConcluidas: [],
        entrega: '',
        reflexao: '',
      });
      await eventBus.publishWithOutbox(DomainEventName.EXPERIENCIA_PARTICIPACAO, {
        experienciaId: id,
        estudanteId: userId,
      });
      return c.json(dto(res.data), 201);
    } finally {
      await lock.release();
    }
  }
);

experienciaParticipationRoutes.put(
  '/:id/progresso',
  verifyJwt,
  checkRole([...learners]),
  zValidator('json', ProgressoExperienciaPayloadSchema),
  async (c) => {
    const experience = await publicExperience(c.req.param('id'));
    if (!experience) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    if (experience.tipoExperiencia !== 'vwx')
      return c.json({ error: 'Entregáveis e progresso pertencem à VWX.' }, 422);
    const id = persistedEntityId(experience);
    const userId = c.get('user').id;
    const lock = await acquireLock(`experiencia:participacao:${id}:${userId}`, 60000);
    if (!lock) return c.json({ error: 'Progresso em atualização. Tenta novamente.' }, 409);
    try {
      const participation = await findParticipation(id, userId);
      if (!participation) return c.json({ error: 'Inicia a VWX antes de guardar progresso.' }, 403);
      if (participation.concluidoEm)
        return c.json({ error: 'Esta participação já foi concluída.' }, 409);
      const body = c.req.valid('json');
      const sections = experience.secoes ?? [];
      const ids = new Set(sections.map((s) => s.id));
      if (body.secoesConcluidas.some((section) => !ids.has(section)))
        return c.json({ error: 'Etapa desconhecida.' }, 422);
      const completed = [...new Set(body.secoesConcluidas)];
      if (
        body.concluir &&
        (!body.entrega.trim() ||
          !body.reflexao.trim() ||
          sections.some((s) => s.obrigatoria && !completed.includes(s.id)) ||
          VWX_SECTION_TYPES.some(
            (type) => !sections.some((s) => s.tipo === type && completed.includes(s.id))
          ))
      ) {
        return c.json({ error: 'Conclui as etapas obrigatórias, o entregável e a reflexão.' }, 422);
      }
      const result = await strapiPut<ParticipationRecord>(
        `/experiencia-participantes/${persistedEntityId(participation)}`,
        {
          secoesConcluidas: completed,
          entrega: body.entrega,
          reflexao: body.reflexao,
          ...(body.concluir ? { concluidoEm: new Date().toISOString() } : {}),
        }
      );
      await eventBus.publishWithOutbox(DomainEventName.EXPERIENCIA_PROGRESSO, {
        experienciaId: id,
        estudanteId: userId,
        concluido: body.concluir,
      });
      return c.json(dto(result.data));
    } finally {
      await lock.release();
    }
  }
);
