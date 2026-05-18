import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { requireApproved } from '../middleware/requireApproved.js';
import { rateLimitContentCreate } from '../middleware/rateLimit.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { CriarExperienciaPayloadSchema, type Experiencia } from '@pdc/shared';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { applyPublicCatalogStateFilter } from './publication-state.js';
import { toPaginatedResponse } from './pagination.js';

type Vars = { Variables: AuthVariables };

interface StrapiExperiencia {
  id: string | number;
  titulo: string;
  instituicaoId: string;
  estado: string;
}

export const experienciaRoutes = new Hono<Vars>();

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
      populate: 'capa,instituicao',
      sort: 'createdAt:desc',
    };
    if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
    if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
    applyPublicCatalogStateFilter(params);
    const res = await strapiGet<Experiencia>('/experiencias', params);
    return c.json(toPaginatedResponse(res));
  } catch {
    return c.json({ error: 'Falha ao sincronizar o catálogo de experiências' }, 502);
  }
});

// GET /experiencias/minhas — protegido
experienciaRoutes.get('/minhas', verifyJwt, checkRole(['instituicao', 'mentor', 'super_admin']), async (c) => {
  const { id } = c.get('user');
  try {
    const res = await strapiGet<Experiencia>('/experiencias', {
      'filters[instituicaoId][$eq]': id,
      populate: 'capa',
    });
    return c.json(toPaginatedResponse(res));
  } catch {
    return c.json({ error: 'Erro ao recuperar as tuas experiências' }, 502);
  }
});

// GET /experiencias/stats — protegido
experienciaRoutes.get('/stats', verifyJwt, checkRole(['instituicao', 'super_admin']), async (c) => {
  const { id: userId } = c.get('user');
  try {
    const [experiencias, programas, inscricoes] = await Promise.all([
      strapiGet<{ id: string }>('/experiencias', {
        'filters[instituicaoId][$eq]': userId,
        'filters[estado][$in]': ['approved', 'published'],
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ id: string }>('/programas', {
        'filters[instituicaoId][$eq]': userId,
        'filters[estado][$eq]': 'activo',
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ id: string }>('/inscricoes', {
        'filters[experiencia][instituicaoId][$eq]': userId,
        'pagination[pageSize]': '1',
      }),
    ]);

    return c.json({
      experienciasPublicadas: experiencias.meta.pagination.total,
      programasActivos: programas.meta.pagination.total,
      inscricoesTotais: inscricoes.meta.pagination.total,
    });
  } catch {
    return c.json({ error: 'Falha ao obter estatísticas institucionais' }, 502);
  }
});

// BUG-008: GET /experiencias/:id — detalhe público
// Aplica filtro de estado para não expor drafts/rejected por ID direto
experienciaRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const params: Record<string, string | string[]> = {
      'filters[id][$eq]': id,
      'pagination[pageSize]': '1',
      populate: 'capa,instituicao',
    };
    applyPublicCatalogStateFilter(params);
    const res = await strapiGet<Experiencia>('/experiencias', params);
    const exp = res.data[0];
    if (!exp) return c.json({ error: 'Experiência não encontrada' }, 404);
    return c.json(exp);
  } catch {
    return c.json({ error: 'Falha ao carregar experiência' }, 502);
  }
});

// POST /experiencias — protegido
experienciaRoutes.post('/',
  verifyJwt,
  checkRole(['instituicao', 'mentor', 'super_admin']),
  requireApproved(),
  rateLimitContentCreate,
  zValidator('json', CriarExperienciaPayloadSchema),
  async (c) => {
    const body = c.req.valid('json');
    const { id } = c.get('user');

    try {
      const res = await strapiPost<Experiencia>('/experiencias', {
        ...body,
        instituicaoId: id,
        estado: 'draft',
        slug: body.titulo.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
      });

      const event = await eventBus.publishWithOutbox(DomainEventName.EXPERIENCIA_CRIADA, {
        experienciaId: res.data.id,
        autorId: id,
        titulo: body.titulo,
        area: body.area
      });

      return c.json({
        ...res.data,
        eventId: event.id
      }, 201);
    } catch {
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
      // Verificar que a experiência existe e está disponível para participação
      const expParams: Record<string, string | string[]> = {
        'filters[id][$eq]': id,
        'pagination[pageSize]': '1',
      };
      applyPublicCatalogStateFilter(expParams);
      const resExp = await strapiGet<StrapiExperiencia>('/experiencias', expParams);
      const exp = resExp.data[0];

      if (!exp) return c.json({ error: 'Experiência não disponível para inscrição' }, 404);

      // Verificar inscrição duplicada
      const resDup = await strapiGet<{ id: string }>('/experiencia-participantes', {
        'filters[estudanteId][$eq]': userId,
        'filters[experiencia][id][$eq]': id,
        'pagination[pageSize]': '1',
      });
      if (resDup.data.length > 0) {
        return c.json({ error: 'Já inscrito nesta experiência' }, 409);
      }

      // Criar participação com os campos reais do schema Strapi
      const res = await strapiPost<{ id: string }>('/experiencia-participantes', {
        estudanteId: userId,
        experiencia: id,
      });

      await eventBus.publishWithOutbox(DomainEventName.EXPERIENCIA_PARTICIPACAO, {
        experienciaId: id,
        estudanteId: userId,
      });

      return c.json({ id: res.data.id }, 201);
    } catch {
      return c.json({ error: 'Falha ao processar inscrição' }, 502);
    }
  }
);

// PUT /experiencias/:id — protegido
experienciaRoutes.put('/:id',
  verifyJwt,
  checkRole(['instituicao', 'mentor', 'super_admin']),
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
      });
      const existing = resGet.data[0];

      if (!existing) return c.json({ error: 'Experiência não identificada' }, 404);

      if (existing.instituicaoId !== userId && role !== 'super_admin') {
        return c.json({ error: 'Autoridade insuficiente' }, 403);
      }

      const resPut = await strapiPut<Experiencia>(`/experiencias/${id}`, body);
      return c.json(resPut.data);
    } catch {
      return c.json({ error: 'Falha na atualização da experiência' }, 502);
    }
  }
);

// PATCH /experiencias/:id/estado — protegido
experienciaRoutes.patch('/:id/estado',
  verifyJwt,
  checkRole(['instituicao', 'mentor', 'comite_cientifico', 'moderador', 'super_admin']),
  zValidator('json', z.object({ estado: z.string().min(1) })),
  async (c) => {
    const id = c.req.param('id');
    const { estado } = c.req.valid('json');
    const { id: userId, role } = c.get('user');

    try {
      // BUG-012: mesmo fix — filtro em vez de endpoint single-entity
      const resGet = await strapiGet<StrapiExperiencia>('/experiencias', {
        'filters[id][$eq]': id,
        'pagination[pageSize]': '1',
      });
      const existing = resGet.data[0];

      if (!existing) return c.json({ error: 'Experiência não identificada' }, 404);

      const podeTransicionar = (): boolean => {
        if (role === 'super_admin') return true;

        if ((role === 'instituicao' || role === 'mentor') &&
            existing.estado === 'draft' && estado === 'review') {
          return existing.instituicaoId === userId;
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

      await strapiPut(`/experiencias/${id}`, { estado });

      if (estado === 'published' || estado === 'approved') {
        await eventBus.publishWithOutbox(DomainEventName.EXPERIENCIA_PUBLICADA, {
          experienciaId: id,
          autorId: existing.instituicaoId,
          titulo: existing.titulo
        });
      }

      return c.json({ success: true });
    } catch {
      return c.json({ error: 'Falha na transição de estado' }, 502);
    }
  }
);
