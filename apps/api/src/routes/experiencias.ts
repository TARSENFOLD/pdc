import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { CriarExperienciaPayloadSchema, type Experiencia } from '@pdc/shared';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';

type Vars = { Variables: AuthVariables };

interface StrapiExperiencia {
  id: string | number;
  titulo: string;
  instituicaoId: string;
  estado: string;
}

export const experienciaRoutes = new Hono<Vars>();

experienciaRoutes.use('*', verifyJwt);

// GET /experiencias
experienciaRoutes.get('/', async (c) => {
  try {
    const res = await strapiGet<Experiencia>('/experiencias', {
      'filters[estado][$eq]': 'published',
      populate: 'capa,instituicao',
      sort: 'createdAt:desc'
    });
    return c.json(res);
  } catch {
    return c.json({ error: 'Falha ao sincronizar o catálogo de experiências' }, 502);
  }
});

// GET /experiencias/minhas
experienciaRoutes.get('/minhas', checkRole(['instituicao', 'mentor', 'super_admin']), async (c) => {
  const { id } = c.get('user');
  try {
    const res = await strapiGet<Experiencia>('/experiencias', {
      'filters[instituicaoId][$eq]': id,
      populate: 'capa',
    });
    return c.json(res);
  } catch {
    return c.json({ error: 'Erro ao recuperar as tuas experiências' }, 502);
  }
});

// GET /experiencias/stats — KPIs para o dashboard institucional
experienciaRoutes.get('/stats', checkRole(['instituicao', 'super_admin']), async (c) => {
  const { id: userId } = c.get('user');
  try {
    const [experiencias, programas, inscricoes] = await Promise.all([
      strapiGet<{ id: string }>('/experiencias', {
        'filters[instituicaoId][$eq]': userId,
        'filters[estado][$eq]': 'published',
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

// POST /experiencias
experienciaRoutes.post('/', 
  checkRole(['instituicao', 'mentor', 'super_admin']), 
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

      // G15: Impacto no Ecossistema
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

// PUT /experiencias/:id
experienciaRoutes.put('/:id', 
  checkRole(['instituicao', 'mentor', 'super_admin']), 
  zValidator('json', CriarExperienciaPayloadSchema.partial()), 
  async (c) => {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const { id: userId, role } = c.get('user');

    try {
      const resGet = await strapiGet<StrapiExperiencia>(`/experiencias/${id}`);
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

// PATCH /experiencias/:id/estado
experienciaRoutes.patch('/:id/estado', 
  checkRole(['instituicao', 'mentor', 'comite_cientifico', 'moderador', 'super_admin']), 
  zValidator('json', z.object({ estado: z.string().min(1) })),
  async (c) => {
    const id = c.req.param('id');
    const { estado } = c.req.valid('json');
  const { id: userId, role } = c.get('user');

  try {
    const resGet = await strapiGet<StrapiExperiencia>(`/experiencias/${id}`);
    const existing = resGet.data[0];

    if (!existing) return c.json({ error: 'Experiência não identificada' }, 404);

    // Validar permissões por estado e role
    const podeTransicionar = (): boolean => {
      if (role === 'super_admin') return true;
      
      // Instituição/Mentor: draft -> review
      if ((role === 'instituicao' || role === 'mentor') && 
          existing.estado === 'draft' && estado === 'review') {
        return existing.instituicaoId === userId;
      }
      
      // Comité Científico: review -> approved/rejected
      if (role === 'comite_cientifico') {
        return existing.estado === 'review' && (estado === 'approved' || estado === 'rejected');
      }
      
      // Moderador: pode arquivar
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
});
