import { Hono, type Handler } from 'hono';
import pino from 'pino';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Inscricao, Role } from '@pdc/shared';
import {
  verifyJwt,
  type AuthVariables,
  type OptionalAuthVariables,
} from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import {
  CONTENT_ACCESS_ERRORS,
  decideLearnerAccess,
  parseContentState,
} from '../modules/conteudo/content-access.service.js';
import { cursosService } from '../modules/cursos/cursos.service.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { persistedEntityId } from '../modules/strapi/strapi-entity.js';

type Vars = { Variables: OptionalAuthVariables };
const log = pino({ name: 'curso-learning-routes' });
const LEARNER_ROLES: Role[] = ['estudante', 'mentor', 'instituicao', 'super_admin'];
const COURSE_REVIEWER_ROLES = ['comite_cientifico', 'moderador'] as const;

interface CourseEnrollmentAccess extends Omit<Inscricao, 'curso'> {
  curso?: { id: string | number; documentId?: string };
}

export const cursoLearningRoutes = new Hono<Vars>();

cursoLearningRoutes.get('/me/inscricoes', verifyJwt, async (c) => {
  const user = c.get('user');
  try {
    const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
    const res = await strapiGet<CourseEnrollmentAccess>('/inscricoes', {
      'filters[perfil][id][$eq]': perfilId,
      populate: 'curso',
      'pagination[pageSize]': '100',
    });
    const courseIds = res.data.map((enrollment) =>
      enrollment.curso ? persistedEntityId(enrollment.curso) : undefined
    );
    if (courseIds.some((cursoId) => cursoId === undefined)) {
      return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    }
    const resolvedCourseIds = courseIds.filter(
      (cursoId): cursoId is string => cursoId !== undefined
    );
    const versionsByCourse = await cursosService.obterVersoesCursos(resolvedCourseIds);
    for (const enrollment of res.data) {
      const cursoId = enrollment.curso ? persistedEntityId(enrollment.curso) : undefined;
      if (!cursoId) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
      const versions = versionsByCourse.get(cursoId) ?? {};
      const current = versions.current ?? versions.published;
      const decision = decideLearnerAccess({
        actor: user,
        authorId: current?.autorId,
        reviewerRoles: COURSE_REVIEWER_ROLES,
        currentState: parseContentState(current?.estado),
        publishedState: parseContentState(versions.published?.estado),
        hasPublishedVersion: versions.published !== undefined,
        relationExists: true,
        accessPolicy: 'granted',
      });
      if (decision === 'preview_only') return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
      if (decision === 'content_not_available') {
        return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
      }
      if (decision === 'content_not_found') {
        return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
      }
    }
    return c.json(res);
  } catch (err: unknown) {
    log.error({ err, userId: user.id }, 'Falha ao listar inscrições em cursos');
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

async function resolvePublishedCourseId(
  user: AuthVariables['user'],
  cursoId: string,
  perfilId: string
): Promise<{ decision: ReturnType<typeof decideLearnerAccess>; publishedCourseId?: string }> {
  const versions = await cursosService.obterVersoesCurso(cursoId);
  const current = versions.current ?? versions.published;
  const reference = current ?? versions.published;
  const persistedCursoId = reference ? persistedEntityId(reference) : undefined;
  const existing = persistedCursoId
    ? await cursosService.buscarInscricao(persistedCursoId, perfilId)
    : undefined;
  const decision = decideLearnerAccess({
    actor: user,
    authorId: current?.autorId,
    reviewerRoles: COURSE_REVIEWER_ROLES,
    currentState: parseContentState(current?.estado),
    publishedState: parseContentState(versions.published?.estado),
    hasPublishedVersion: versions.published !== undefined,
    relationExists: existing !== undefined,
    accessPolicy: 'open',
  });
  return {
    decision,
    ...(versions.published ? { publishedCourseId: persistedEntityId(versions.published) } : {}),
  };
}

const enrollInCourse: Handler<{ Variables: AuthVariables }> = async (c) => {
  const user = c.get('user');
  try {
    const cursoId = c.req.param('id');
    if (!cursoId) return c.json({ error: 'Id do curso é obrigatório' }, 400);
    const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
    const access = await resolvePublishedCourseId(user, cursoId, perfilId);
    if (access.decision === 'preview_only') {
      return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
    }
    if (access.decision === 'content_not_available') {
      return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
    }
    if (access.decision === 'content_not_found' || !access.publishedCourseId) {
      return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    }
    const res = await cursosService.inscreverUtilizador(
      access.publishedCourseId,
      user.id,
      perfilId,
      user.role
    );
    return c.json(res, 201);
  } catch (err: unknown) {
    log.error(
      { err, userId: user.id, cursoId: c.req.param('id') },
      'Falha ao inscrever utilizador no curso'
    );
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
};

cursoLearningRoutes.post('/:id/inscricao', verifyJwt, checkRole(LEARNER_ROLES), enrollInCourse);
cursoLearningRoutes.post('/:id/inscrever', verifyJwt, checkRole(LEARNER_ROLES), enrollInCourse);

cursoLearningRoutes.get('/:id/progresso', verifyJwt, checkRole(LEARNER_ROLES), async (c) => {
  const user = c.get('user');
  try {
    const cursoId = c.req.param('id');
    if (!cursoId) return c.json({ error: 'Id do curso é obrigatório' }, 400);
    const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
    const access = await resolvePublishedCourseId(user, cursoId, perfilId);
    if (access.decision === 'preview_only') {
      return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
    }
    if (access.decision === 'content_not_available') {
      return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
    }
    if (access.decision === 'content_not_found' || !access.publishedCourseId) {
      return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    }
    const progresso = await cursosService.listarProgresso(access.publishedCourseId, perfilId);
    if (progresso === null) return c.json({ error: 'Inscrição não encontrada' }, 404);
    return c.json(progresso);
  } catch (err: unknown) {
    log.error(
      { err, userId: user.id, cursoId: c.req.param('id') },
      'Falha ao carregar progresso do curso'
    );
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

cursoLearningRoutes.patch(
  '/:id/progresso/:itemId',
  verifyJwt,
  checkRole(LEARNER_ROLES),
  zValidator('json', z.object({ concluido: z.boolean() })),
  async (c) => {
    const user = c.get('user');
    try {
      const cursoId = c.req.param('id');
      const itemId = c.req.param('itemId');
      if (!cursoId || !itemId) {
        return c.json({ error: 'Id do curso e do item são obrigatórios' }, 400);
      }
      const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
      const access = await resolvePublishedCourseId(user, cursoId, perfilId);
      if (access.decision === 'preview_only') {
        return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
      }
      if (access.decision === 'content_not_available') {
        return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
      }
      if (access.decision === 'content_not_found' || !access.publishedCourseId) {
        return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
      }
      const item = await cursosService.marcarItem(
        access.publishedCourseId,
        itemId,
        perfilId,
        user.id,
        c.req.valid('json').concluido
      );
      return c.json(item);
    } catch (err: unknown) {
      log.error(
        {
          err,
          userId: user.id,
          cursoId: c.req.param('id'),
          itemId: c.req.param('itemId'),
        },
        'Falha ao atualizar progresso do curso'
      );
      return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
    }
  }
);
