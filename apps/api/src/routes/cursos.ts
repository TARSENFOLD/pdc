import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type OptionalAuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { requireApproved } from '../middleware/requireApproved.js';
import { rateLimitContentCreate } from '../middleware/rateLimit.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import {
  AtualizarCursoPayloadSchema,
  avaliarProntidaoCurso,
  CriarCursoPayloadSchema,
  type CriarCursoPayload,
  Curso,
} from '@pdc/shared';
import { cursosService } from '../modules/cursos/cursos.service.js';
import { toPaginatedResponse } from './pagination.js';
import {
  disabledFeatureResponse,
  requireContentSubmissionEnabled,
  requireInternalQaCreatorAccess,
} from '../modules/feature-flags/cor-0001-gates.js';
import { env } from '../lib/env.js';
import { cursoCatalogRoutes } from './cursos-catalog.routes.js';
import { cursoLearningRoutes } from './cursos-learning.routes.js';

// C-01: OptionalAuthVariables — GET / e GET /:id são públicos; rotas protegidas usam verifyJwt individualmente
type Vars = { Variables: OptionalAuthVariables };

function transitionErrorStatus(error: unknown): 400 | 403 | 404 | 409 | 502 | 503 {
  if (typeof error !== 'object' || error === null || !('status' in error)) return 502;
  const status = error.status;
  return status === 400 || status === 403 || status === 404 || status === 409 || status === 503
    ? status
    : 502;
}

export const cursoRoutes = new Hono<Vars>();
cursoRoutes.route('/', cursoLearningRoutes);

// GET /cursos/meus — cursos do criador (protegido)
cursoRoutes.get(
  '/meus',
  verifyJwt,
  checkRole(['mentor', 'instituicao', 'super_admin']),
  async (c) => {
    const user = c.get('user');
    try {
      const res = await strapiGet<Curso>('/cursos', {
        'filters[autorId][$eq]': user.id,
        populate: 'autor',
        'pagination[page]': c.req.query('page') || '1',
        status: 'draft',
      });
      return c.json(toPaginatedResponse(res));
    } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

cursoRoutes.route('/', cursoCatalogRoutes);

// POST /cursos — criar curso (protegido)
cursoRoutes.post(
  '/',
  verifyJwt,
  checkRole(['mentor', 'instituicao', 'super_admin']),
  requireInternalQaCreatorAccess(),
  requireApproved(),
  rateLimitContentCreate,
  zValidator('json', CriarCursoPayloadSchema),
  async (c) => {
    const user = c.get('user');
    try {
      const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
      const draftPayload = {
        ...c.req.valid('json'),
        estado: 'draft',
      } satisfies CriarCursoPayload;
      const curso = await cursosService.criarCursoCompleto(draftPayload, user.id, perfilId);
      return c.json(curso, 201);
    } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

// PUT /cursos/:id — atualizar curso (protegido)
cursoRoutes.put(
  '/:id',
  verifyJwt,
  checkRole(['mentor', 'instituicao', 'moderador', 'super_admin']),
  requireInternalQaCreatorAccess(),
  zValidator('json', AtualizarCursoPayloadSchema),
  async (c) => {
    const user = c.get('user');
    try {
      const curso = await cursosService.obterCursoBase(c.req.param('id'));
      if (!curso) return c.json({ error: 'Curso não encontrado' }, 404);
      if (curso.autorId !== user.id && !['moderador', 'super_admin'].includes(user.role)) {
        return c.json({ error: 'Não tem permissão' }, 403);
      }
      const resPut = await cursosService.atualizarCurso(
        c.req.param('id'),
        c.req.valid('json'),
        user.id
      );
      return c.json(resPut);
    } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

// POST /cursos/:id/submeter — submissão canónica para revisão
cursoRoutes.post(
  '/:id/submeter',
  verifyJwt,
  checkRole(['mentor', 'instituicao', 'super_admin']),
  requireContentSubmissionEnabled(),
  requireInternalQaCreatorAccess(),
  async (c) => {
    const user = c.get('user');
    try {
      const curso = await cursosService.obterCursoBase(c.req.param('id'));
      if (!curso) return c.json({ error: 'Curso não encontrado' }, 404);
      if (curso.autorId !== user.id && user.role !== 'super_admin') {
        return c.json({ error: 'Sem permissão' }, 403);
      }
      if (curso.estado !== 'draft') {
        return c.json({ error: `Transição inválida de ${curso.estado} para review` }, 409);
      }
      const completeCourse = await cursosService.obterCursoComModulos(c.req.param('id'), 'draft');
      if (!completeCourse) return c.json({ error: 'Curso não encontrado' }, 404);
      const readiness = avaliarProntidaoCurso(completeCourse, {
        allowLocalHttp: env.NODE_ENV !== 'production',
      });
      if (!readiness.ready) {
        return c.json(
          {
            error: 'O curso ainda não cumpre os critérios para revisão.',
            code: 'COURSE_NOT_READY',
            issues: readiness.issues,
          },
          422
        );
      }
      await cursosService.alterarEstado(c.req.param('id'), 'review', curso.autorId, completeCourse);
      return c.json({ success: true });
    } catch (err: unknown) {
      return c.json(
        { error: err instanceof Error ? err.message : 'Erro interno' },
        transitionErrorStatus(err)
      );
    }
  }
);

// PATCH /cursos/:id/estado (protegido)
cursoRoutes.patch(
  '/:id/estado',
  verifyJwt,
  checkRole(['mentor', 'instituicao', 'moderador', 'super_admin']),
  requireInternalQaCreatorAccess(),
  zValidator('json', z.object({ estado: z.enum(['draft', 'review', 'published', 'archived']) })),
  async (c) => {
    const user = c.get('user');
    try {
      const nextState = c.req.valid('json').estado;
      if (nextState === 'review') {
        const unavailable = await disabledFeatureResponse(
          c,
          'content_submission_enabled',
          'CONTENT_SUBMISSION_TEMPORARILY_DISABLED'
        );
        if (unavailable) return unavailable;
      }
      const curso = await cursosService.obterCursoBase(c.req.param('id'));
      if (!curso) return c.json({ error: 'Curso não encontrado' }, 404);
      const podeEditar =
        user.id === curso.autorId || ['moderador', 'super_admin'].includes(user.role);
      if (!podeEditar) return c.json({ error: 'Sem permissão' }, 403);
      if (nextState === 'review' && curso.estado !== 'draft') {
        return c.json({ error: `Transição inválida de ${curso.estado} para review` }, 409);
      }
      if (nextState === 'published' && curso.estado !== 'approved' && user.role !== 'super_admin') {
        return c.json({ error: 'Curso precisa estar aprovado antes da publicação' }, 409);
      }
      let transitionCourse: Curso = curso;
      if (nextState === 'review' || nextState === 'published') {
        const completeCourse = await cursosService.obterCursoComModulos(c.req.param('id'), 'draft');
        if (!completeCourse) return c.json({ error: 'Curso não encontrado' }, 404);
        const readiness = avaliarProntidaoCurso(completeCourse, {
          allowLocalHttp: env.NODE_ENV !== 'production',
        });
        if (!readiness.ready) {
          return c.json(
            {
              error: 'O curso ainda não cumpre os critérios editoriais.',
              code: 'COURSE_NOT_READY',
              issues: readiness.issues,
            },
            422
          );
        }
        transitionCourse = completeCourse;
      }
      await cursosService.alterarEstado(
        c.req.param('id'),
        nextState,
        curso.autorId,
        transitionCourse
      );
      return c.json({ success: true });
    } catch (err: unknown) {
      return c.json(
        { error: err instanceof Error ? err.message : 'Erro interno' },
        transitionErrorStatus(err)
      );
    }
  }
);
