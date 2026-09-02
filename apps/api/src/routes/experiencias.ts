import { Hono } from 'hono';
import pino from 'pino';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { requireApproved } from '../middleware/requireApproved.js';
import { rateLimitContentCreate } from '../middleware/rateLimit.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import {
  CriarExperienciaPayloadSchema,
  parsePainelRealidade,
  type Experiencia,
  type ExperienciaSecao,
} from '@pdc/shared';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { applyPublicCatalogStateFilter } from './publication-state.js';
import { toPaginatedResponse } from './pagination.js';
import { findStrapiEntity, persistedEntityId } from '../modules/strapi/strapi-entity.js';
import {
  disabledFeatureResponse,
  requireContentSubmissionEnabled,
  requireInternalQaCreatorAccess,
} from '../modules/feature-flags/cor-0001-gates.js';
import {
  canExposeExperience,
  filterVwxExperiences,
  isVwxCatalogEnabled,
  type ExperienceVariantCarrier,
} from '../modules/feature-flags/vwx-catalog-gate.js';
import {
  contentRelationIdentityFilters,
  loadContentVersions,
} from '../modules/conteudo/content-access.repository.js';
import {
  CONTENT_ACCESS_ERRORS,
  canPreviewContent,
  canReadResolvedPublicContent,
  decideLearnerAccess,
  parseContentState,
} from '../modules/conteudo/content-access.service.js';

type Vars = { Variables: AuthVariables };
const log = pino({ name: 'routes:experiencias' });

interface StrapiExperiencia {
  id: string | number;
  documentId?: string;
  titulo: string;
  estado: string;
  tipoExperiencia?: 'institucional' | 'vwx';
  autor?: {
    id?: string | number;
    userId?: string;
  };
  instituicao?: {
    id?: string | number;
  };
  secoes?: ExperienciaSecao[];
}

const REQUIRED_SECTION_GROUPS = [
  ['boas_vindas'],
  ['realidade'],
  ['ano_fase', 'curriculo'],
  ['depoimentos'],
  ['infraestrutura'],
  ['proximos_passos'],
] as const;

function missingRequiredSections(secoes: ExperienciaSecao[] | undefined): string[] {
  const tipos = new Set((secoes ?? []).map((secao) => secao.tipo));
  return REQUIRED_SECTION_GROUPS
    .filter((group) => !group.some((tipo) => tipos.has(tipo)))
    .map((group) => group.join('|'));
}

function normalizeExperiencia(experiencia: Experiencia): Experiencia {
  if (!experiencia.painelRealidade) return experiencia;
  try {
    return { ...experiencia, painelRealidade: parsePainelRealidade(experiencia.painelRealidade) };
  } catch (error) {
    log.warn({ error, experienciaId: experiencia.id }, 'Falha ao normalizar painelRealidade');
    return experiencia;
  }
}

export const experienciaRoutes = new Hono<Vars>();
const EXPERIENCE_REVIEWER_ROLES = ['comite_cientifico', 'moderador'] as const;

// BUG-011: verifyJwt é aplicado apenas nas rotas protegidas.
// GET / e GET /:id são públicos (catálogo aberto).

// GET /experiencias — catálogo público
const experienciaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

experienciaRoutes.get('/', zValidator('query', experienciaQuerySchema), async (c) => {
  try {
    const q = c.req.valid('query');
    const params: Record<string, string | string[]> = {
      populate: 'instituicao',
      sort: 'createdAt:desc',
    };
    if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
    if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
    applyPublicCatalogStateFilter(params);
    const res = await strapiGet<Experiencia & ExperienceVariantCarrier>('/experiencias', params);
    const vwxEnabled = await isVwxCatalogEnabled();
    const visible = filterVwxExperiences(res.data, vwxEnabled);
    return c.json(toPaginatedResponse({ ...res, data: visible.map(normalizeExperiencia) }));
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

// GET /experiencias/minhas — protegido
experienciaRoutes.get('/minhas', verifyJwt, checkRole(['instituicao', 'mentor', 'super_admin']), async (c) => {
  const { id } = c.get('user');
  try {
    const res = await strapiGet<Experiencia>('/experiencias', {
      'filters[autor][userId][$eq]': id,
      populate: 'autor,instituicao',
      sort: 'createdAt:desc',
    });
    return c.json(toPaginatedResponse({ ...res, data: res.data.map(normalizeExperiencia) }));
  } catch {
    return c.json({ error: 'Erro ao recuperar as tuas experiências' }, 502);
  }
});

experienciaRoutes.get('/minhas/:id', verifyJwt, checkRole(['instituicao', 'mentor', 'comite_cientifico', 'moderador', 'super_admin']), requireInternalQaCreatorAccess(), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Experiência não identificada' }, 400);
  try {
    const experiencia = await findStrapiEntity<Experiencia & StrapiExperiencia>('experiencias', id, {
      status: 'draft',
      populate: 'autor,instituicao',
    });
    if (!experiencia) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    if (!canPreviewContent({
      actor: user,
      authorId: experiencia.autor?.userId,
      reviewerRoles: EXPERIENCE_REVIEWER_ROLES,
    })) {
      return c.json({ error: 'Autoridade insuficiente' }, 403);
    }
    return c.json(normalizeExperiencia(experiencia));
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

// GET /experiencias/stats — protegido
experienciaRoutes.get('/stats', verifyJwt, checkRole(['instituicao', 'super_admin']), async (c) => {
  const { id: userId } = c.get('user');
  try {
    const contentParams: Record<string, string | string[]> = {
      'filters[autor][userId][$eq]': userId,
      'pagination[pageSize]': '1',
    };
    const [experiencias, cursos, simulacoes, programas, inscricoes, participacoes] = await Promise.all([
      strapiGet<{ id: string }>('/experiencias', contentParams),
      strapiGet<{ id: string }>('/cursos', {
        'filters[autorId][$eq]': userId,
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ id: string }>('/simulacoes', {
        'filters[autorId][$eq]': userId,
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ id: string }>('/programas', {
        'filters[responsavel][userId][$eq]': userId,
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ id: string }>('/inscricoes', {
        'filters[curso][autorId][$eq]': userId,
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ id: string }>('/experiencia-participantes', {
        'filters[experiencia][autor][userId][$eq]': userId,
        'pagination[pageSize]': '1',
      }),
    ]);

    const totals = {
      experiencias: experiencias.meta.pagination.total,
      cursos: cursos.meta.pagination.total,
      simulacoes: simulacoes.meta.pagination.total,
      programas: programas.meta.pagination.total,
      inscricoes: inscricoes.meta.pagination.total,
      participacoes: participacoes.meta.pagination.total,
    };
    const hasInvalidTotal = Object.values(totals).some(
      (total) => !Number.isInteger(total) || total < 0,
    );
    if (hasInvalidTotal) {
      return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
    }

    return c.json({
      conteudosTotais:
        totals.experiencias
        + totals.cursos
        + totals.simulacoes
        + totals.programas,
      inscricoesTotais: totals.inscricoes,
      participacoesTotais: totals.participacoes,
    });
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

// BUG-008: GET /experiencias/:id — detalhe público
// Aplica filtro de estado para não expor drafts/rejected por ID direto
experienciaRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const versions = await loadContentVersions((status) => (
      findStrapiEntity<Experiencia & StrapiExperiencia>('experiencias', id, {
        status,
        populate: 'instituicao,autor',
      })
    ));
    const current = versions.current ?? versions.published;
    const publicReadable = canReadResolvedPublicContent({
      currentState: parseContentState(current?.estado),
      publishedState: parseContentState(versions.published?.estado),
      hasPublishedVersion: versions.published !== undefined,
    });
    if (!publicReadable || !versions.published || !canExposeExperience(
      versions.published,
      await isVwxCatalogEnabled(),
    )) {
      return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    }
    return c.json(normalizeExperiencia(versions.published));
  } catch {
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
  }
});

// POST /experiencias — protegido
experienciaRoutes.post('/',
  verifyJwt,
  checkRole(['instituicao', 'mentor', 'super_admin']),
  requireInternalQaCreatorAccess(),
  requireApproved(),
  rateLimitContentCreate,
  zValidator('json', CriarExperienciaPayloadSchema),
  async (c) => {
    const body = c.req.valid('json');
    const { id, perfilId } = c.get('user');

    try {
      const resolvedPerfilId = perfilId ?? (await strapiGet<{ id: string | number }>('/perfis', {
        'filters[userId][$eq]': id,
        'fields[0]': 'id',
        'pagination[pageSize]': '1',
      })).data[0]?.id;
      if (resolvedPerfilId === undefined) {
        return c.json({ error: 'Perfil do autor não encontrado' }, 404);
      }
      const slug = body.titulo.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      const draftPayload = {
        ...body,
        autor: String(resolvedPerfilId),
        estado: 'draft',
        slug,
      };
      const existingDraft = (await strapiGet<StrapiExperiencia>('/experiencias', {
        'filters[slug][$eq]': slug,
        'filters[autor][id][$eq]': String(resolvedPerfilId),
        'filters[estado][$eq]': 'draft',
        'pagination[pageSize]': '1',
      })).data[0];
      const res = existingDraft
        ? await strapiPut<Experiencia>(
          `/experiencias/${existingDraft.documentId ?? String(existingDraft.id)}`,
          draftPayload,
        )
        : await strapiPost<Experiencia>('/experiencias', draftPayload);
      const experienciaId = normalizeExternalId(res.data.id);

      const event = await eventBus.publishWithOutbox(DomainEventName.EXPERIENCIA_CRIADA, {
        experienciaId,
        autorId: id,
        titulo: body.titulo,
        area: body.area
      });

      return c.json({
        ...res.data,
        id: experienciaId,
        eventId: event.id
      }, existingDraft ? 200 : 201);
    } catch (err) {
      log.error({ err }, 'Falha ao guardar rascunho da experiência');
      return c.json({ error: 'Falha na persistência da experiência' }, 502);
    }
  }
);

// POST /experiencias/:id/inscrever — protegido
// Usa a collection experiencia-participantes (schema verificado: estudanteId + experiencia relation)
experienciaRoutes.post('/:id/inscrever',
  verifyJwt,
  checkRole(['estudante', 'mentor', 'super_admin']),
  async (c) => {
    const id = c.req.param('id') ?? '';
    const { id: userId } = c.get('user');

    try {
      const versions = await loadContentVersions((status) => (
        findStrapiEntity<StrapiExperiencia>('experiencias', id, {
          status,
          populate: 'autor',
        })
      ));
      const current = versions.current ?? versions.published;
      const reference = current ?? versions.published;
      const resDup = reference
        ? await strapiGet<{ id: string }>('/experiencia-participantes', {
          'filters[estudanteId][$eq]': userId,
          ...contentRelationIdentityFilters('experiencia', persistedEntityId(reference)),
          'pagination[pageSize]': '1',
        })
        : undefined;
      const decision = decideLearnerAccess({
        actor: c.get('user'),
        authorId: current?.autor?.userId,
        reviewerRoles: EXPERIENCE_REVIEWER_ROLES,
        currentState: parseContentState(current?.estado),
        publishedState: parseContentState(versions.published?.estado),
        hasPublishedVersion: versions.published !== undefined,
        relationExists: resDup !== undefined && resDup.data.length > 0,
        accessPolicy: current?.tipoExperiencia === 'vwx' ? 'restricted' : 'open',
      });
      if (decision === 'preview_only') return c.json(CONTENT_ACCESS_ERRORS.preview_only, 403);
      if (decision === 'content_not_available') return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
      if (decision === 'content_not_found') return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
      if (!versions.published) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
      if (resDup && resDup.data.length > 0) {
        return c.json({ error: 'Já inscrito nesta experiência' }, 409);
      }

      // Criar participação com os campos reais do schema Strapi
      const experienciaId = persistedEntityId(versions.published);
      const res = await strapiPost<{ id: string }>('/experiencia-participantes', {
        estudanteId: userId,
        experiencia: experienciaId,
      });

      await eventBus.publishWithOutbox(DomainEventName.EXPERIENCIA_PARTICIPACAO, {
        experienciaId,
        estudanteId: userId,
      });

      return c.json({ id: res.data.id }, 201);
    } catch {
      return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
    }
  }
);

// PUT /experiencias/:id — protegido
experienciaRoutes.put('/:id',
  verifyJwt,
  checkRole(['instituicao', 'mentor', 'super_admin']),
  requireInternalQaCreatorAccess(),
  zValidator('json', CriarExperienciaPayloadSchema.partial()),
  async (c) => {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const { id: userId, role } = c.get('user');

    try {
      // BUG-012: strapiGet com ID directo retorna single-entity (não array).
      // Usar filtro na lista garante data[0] correcto.
      const resGet = await strapiGet<StrapiExperiencia>('/experiencias', {
        'filters[id][$eq]': id,
        'pagination[pageSize]': '1',
        populate: 'autor',
      });
      const existing = resGet.data[0];

      if (!existing) return c.json({ error: 'Experiência não identificada' }, 404);

      if (existing.autor?.userId !== userId && role !== 'super_admin') {
        return c.json({ error: 'Autoridade insuficiente' }, 403);
      }

      const resPut = await strapiPut<Experiencia>(`/experiencias/${id}`, body);
      return c.json(resPut.data);
    } catch {
      return c.json({ error: 'Falha na atualização da experiência' }, 502);
    }
  }
);

// POST /experiencias/:id/submeter — submissão canónica para revisão
experienciaRoutes.post(
  '/:id/submeter',
  verifyJwt,
  checkRole(['instituicao', 'mentor', 'super_admin']),
  requireContentSubmissionEnabled(),
  requireInternalQaCreatorAccess(),
  async (c) => {
    const id = c.req.param('id');
    const { id: userId, role } = c.get('user');
    try {
      const existing = await findStrapiEntity<StrapiExperiencia>('experiencias', id, {
        populate: 'autor',
      });
      if (!existing) return c.json({ error: 'Experiência não identificada' }, 404);
      if (existing.autor?.userId !== userId && role !== 'super_admin') {
        return c.json({ error: 'Autoridade insuficiente' }, 403);
      }
      if (existing.estado !== 'draft') {
        return c.json({ error: `Transição inválida de ${existing.estado} para review` }, 409);
      }
      const missing = missingRequiredSections(existing.secoes);
      if (missing.length > 0) {
        return c.json({
          error: 'A Experiência ainda não cumpre a estrutura mínima para revisão',
          missingSections: missing,
        }, 422);
      }
      await strapiPut(`/experiencias/${persistedEntityId(existing)}`, { estado: 'review' });
      return c.json({ success: true });
    } catch {
      return c.json({ error: 'Falha na transição de estado' }, 502);
    }
  },
);

// PATCH /experiencias/:id/estado — protegido
experienciaRoutes.patch('/:id/estado',
  verifyJwt,
  checkRole(['instituicao', 'mentor', 'comite_cientifico', 'moderador', 'super_admin']),
  requireInternalQaCreatorAccess(),
  zValidator('json', z.object({ estado: z.string().min(1) })),
  async (c) => {
    const id = c.req.param('id');
    const { estado } = c.req.valid('json');
    const { id: userId, role } = c.get('user');

    try {
      if (estado === 'review') {
        const unavailable = await disabledFeatureResponse(
          c,
          'content_submission_enabled',
          'CONTENT_SUBMISSION_TEMPORARILY_DISABLED',
        );
        if (unavailable) return unavailable;
      }
      // BUG-012: mesmo fix — filtro em vez de endpoint single-entity
      const resGet = await strapiGet<StrapiExperiencia>('/experiencias', {
        'filters[id][$eq]': id,
        'pagination[pageSize]': '1',
        populate: 'autor',
      });
      const existing = resGet.data[0];

      if (!existing) return c.json({ error: 'Experiência não identificada' }, 404);

      const podeTransicionar = (): boolean => {
        if (role === 'super_admin') return true;

        if ((role === 'instituicao' || role === 'mentor') &&
            existing.estado === 'draft' && estado === 'review') {
          return existing.autor?.userId === userId;
        }

        if (role === 'comite_cientifico') {
          return existing.estado === 'review' && (estado === 'approved' || estado === 'rejected');
        }

        if (role === 'moderador') {
          return estado === 'archived';
        }

        return false;
      };

      if (!podeTransicionar()) {
        return c.json({ error: 'Transição de estado não permitida para esta role' }, 403);
      }

      if (estado === 'review') {
        const missing = missingRequiredSections(existing.secoes);
        if (missing.length > 0) {
          return c.json({
            error: 'A Experiência ainda não cumpre a estrutura mínima para revisão',
            missingSections: missing,
          }, 422);
        }
      }

      await strapiPut(`/experiencias/${id}`, { estado });

      if (estado === 'published' || estado === 'approved') {
        await eventBus.publishWithOutbox(DomainEventName.EXPERIENCIA_PUBLICADA, {
          experienciaId: id,
          autorId: existing.autor?.userId ?? userId,
          titulo: existing.titulo
        });
      }

      return c.json({ success: true });
    } catch {
      return c.json({ error: 'Falha na transição de estado' }, 502);
    }
  }
);
function normalizeExternalId(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  throw new Error('Strapi devolveu um identificador de experiência inválido');
}
