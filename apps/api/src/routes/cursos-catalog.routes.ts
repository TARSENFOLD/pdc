import { Hono } from 'hono';
import pino from 'pino';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { BehaviorPattern, Curso } from '@pdc/shared';
import { optionalJwt, type OptionalAuthVariables } from '../modules/auth/auth.middleware.js';
import {
  CONTENT_ACCESS_ERRORS,
  canPreviewContent,
  canReadResolvedPublicContent,
  isUnavailableContentState,
  parseContentState,
} from '../modules/conteudo/content-access.service.js';
import { cursosService } from '../modules/cursos/cursos.service.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { persistedEntityId } from '../modules/strapi/strapi-entity.js';
import { toPaginatedResponse } from './pagination.js';
import { applyPublicCatalogStateFilter } from './publication-state.js';

type Vars = { Variables: OptionalAuthVariables };
const log = pino({ name: 'curso-catalog-routes' });

const cursoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  categoria: z.string().optional(),
  autorId: z.string().optional(),
});

const COURSE_REVIEWER_ROLES = ['comite_cientifico', 'moderador'] as const;

function stripLockedItems(curso: Curso): Curso {
  return {
    ...curso,
    modulos: curso.modulos?.map((modulo) => ({
      ...modulo,
      itens: modulo.itens.map((item) => ({
        ...item,
        conteudo: undefined,
        url: undefined,
        imagens: undefined,
      })),
    })),
  };
}

export const cursoCatalogRoutes = new Hono<Vars>();

cursoCatalogRoutes.get('/', optionalJwt, zValidator('query', cursoQuerySchema), async (c) => {
  const q = c.req.valid('query');
  const user = c.get('user');
  const params: Record<string, string | string[]> = { populate: 'autor' };
  applyPublicCatalogStateFilter(params);
  if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
  if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
  if (q.search !== undefined) params['filters[titulo][$containsi]'] = q.search;
  if (q.categoria !== undefined) params['filters[area][$eq]'] = q.categoria;
  if (q.autorId !== undefined) params['filters[autorId][$eq]'] = q.autorId;

  try {
    const res = await strapiGet<Curso>('/cursos', params);
    if (user?.role !== 'estudante') return c.json(toPaginatedResponse(res));

    const patternsRes = await strapiGet<BehaviorPattern>('/behavior-patterns', {
      'filters[perfil][userId][$eq]': user.id,
    });
    const pattern = patternsRes.data[0];
    const enrichedData = res.data.map((curso) => {
      const rules = curso.regrasAcesso;
      let blocked = false;
      let reason = '';
      if (rules && pattern) {
        if (
          rules.minFluidez &&
          Number.isFinite(pattern.cognitiveFluidity) &&
          pattern.cognitiveFluidity < rules.minFluidez
        ) {
          blocked = true;
          reason = 'Fluidez insuficiente';
        }
        if (
          rules.minResiliencia &&
          Number.isFinite(pattern.resilienceIndex) &&
          pattern.resilienceIndex < rules.minResiliencia
        ) {
          blocked = true;
          reason = 'Resiliência insuficiente';
        }
      }
      return { ...curso, bloqueado: blocked, motivoBloqueio: reason };
    });
    return c.json(toPaginatedResponse({ ...res, data: enrichedData }));
  } catch (err: unknown) {
    log.error({ err, userId: user?.id }, 'Falha ao listar cursos no catálogo');
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

cursoCatalogRoutes.get('/:id', optionalJwt, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
  try {
    const versions = await cursosService.obterVersoesCurso(id);
    const current = versions.current ?? versions.published;
    const currentState = parseContentState(current?.estado);
    const publishedState = parseContentState(versions.published?.estado);
    const user = c.get('user');
    const publicReadable = canReadResolvedPublicContent({
      currentState,
      publishedState,
      hasPublishedVersion: versions.published !== undefined,
    });

    if (!publicReadable) {
      if (user && isUnavailableContentState(currentState)) {
        const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
        const reference = current ?? versions.published;
        const existing = reference
          ? await cursosService.buscarInscricao(persistedEntityId(reference), perfilId)
          : undefined;
        if (existing) return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
      }
      const previewRequested = c.req.query('preview') === 'true';
      if (
        !previewRequested ||
        !user ||
        !current ||
        !canPreviewContent({
          actor: user,
          authorId: current.autorId,
          reviewerRoles: COURSE_REVIEWER_ROLES,
        })
      ) {
        return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
      }
      const preview = await cursosService.obterCursoComModulos(id, 'draft');
      if (!preview) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
      return c.json(preview);
    }

    const data = await cursosService.obterCursoComModulos(id, 'published');
    if (!data) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    if (!user) return c.json(stripLockedItems(data));
    if (
      data.autorId === user.id ||
      ['comite_cientifico', 'moderador', 'super_admin'].includes(user.role)
    )
      return c.json(data);

    const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
    const inscricao = await cursosService.buscarInscricao(persistedEntityId(data), perfilId);
    return c.json(inscricao ? data : stripLockedItems(data));
  } catch (err: unknown) {
    log.error({ err, cursoId: id }, 'Falha ao carregar curso do catálogo');
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});
