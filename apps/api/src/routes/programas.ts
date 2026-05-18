import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

import { verifyJwt, optionalJwt, type OptionalAuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { requireApproved } from '../middleware/requireApproved.js';
import { rateLimitContentCreate } from '../middleware/rateLimit.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { CriarProgramaPayloadSchema, AtualizarProgramaEstadoSchema } from '@pdc/shared';
import { applyPublicCatalogStateFilter, isPublicCatalogEstado } from './publication-state.js';
import { toPaginatedResponse } from './pagination.js';

// GET / e GET /:id são públicos (optionalJwt); rotas protegidas usam verifyJwt individualmente
type Vars = { Variables: OptionalAuthVariables };
export const programaRoutes = new Hono<Vars>();

const PROGRAMA_POPULATE = 'capa,instituicao,responsavel,cursos,experiencias,simulacoes,projetos';

interface StrapiPrograma {
  id: string;
  titulo: string;
  estado: string;
  perfilId?: string;
  instituicaoId?: string;
  responsavel?: { id: string };
  instituicao?: { id: string };
  historicoEstados?: Array<{ estado: string; timestamp: string; autorId: string }>;
  metadata?: unknown;
}

// GET /programas — catálogo público
programaRoutes.get('/', async (c) => {
  try {
    const params: Record<string, string | string[]> = {
      populate: PROGRAMA_POPULATE,
      sort: 'createdAt:desc',
    };
    applyPublicCatalogStateFilter(params);
    const res = await strapiGet<StrapiPrograma>('/programas', params);
    return c.json(toPaginatedResponse(res));
  } catch {
    return c.json({ error: 'Erro ao carregar programas' }, 502);
  }
});

// GET /programas/meus — inscrições do utilizador (protegido)
programaRoutes.get('/meus', verifyJwt, async (c) => {
  const user = c.get('user');
  const { id: userId } = user;
  try {
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    const perfilId = resPerfil.data[0]?.id;
    if (!perfilId) return c.json(toPaginatedResponse({ data: [], meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } } }));
    const res = await strapiGet<StrapiPrograma>('/inscricoes-programas', {
      'filters[perfil][id][$eq]': perfilId,
      populate: 'programa.capa,programa.instituicao',
    });
    return c.json(toPaginatedResponse(res));
  } catch {
    return c.json({ error: 'Erro ao carregar as tuas inscrições' }, 502);
  }
});

// GET /programas/minhas — programas criados pelo utilizador (protegido)
programaRoutes.get('/minhas', verifyJwt, checkRole(['mentor', 'instituicao', 'super_admin']), async (c) => {
  const user = c.get('user');
  const { id: userId, role } = user;
  try {
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    const perfilId = resPerfil.data[0]?.id;
    if (!perfilId) return c.json({ error: 'Perfil não encontrado' }, 404);
    const params: Record<string, string> = { populate: PROGRAMA_POPULATE };
    if (role === 'mentor') {
      params['filters[responsavel][id][$eq]'] = perfilId;
    } else if (role === 'instituicao') {
      params['filters[instituicao][id][$eq]'] = perfilId;
    }
    // super_admin vê todos
    const res = await strapiGet<StrapiPrograma>('/programas', params);
    return c.json(toPaginatedResponse(res));
  } catch {
    return c.json({ error: 'Erro ao carregar programas criados' }, 502);
  }
});

// GET /programas/:id — detalhe com controlo de acesso (criadores vêem os seus rascunhos)
programaRoutes.get('/:id', optionalJwt, async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Id é obrigatório' }, 400);
  try {
    const res = await strapiGet<StrapiPrograma>('/programas', {
      'filters[id][$eq]': id,
      'pagination[pageSize]': '1',
      populate: PROGRAMA_POPULATE,
    });
    const prog = res.data[0];
    if (!prog) return c.json({ error: 'Programa não encontrado' }, 404);

    if (!isPublicCatalogEstado(prog.estado)) {
      const user = c.get('user');
      if (!user) return c.json({ error: 'Programa não disponível' }, 404);

      // Verifica se é o criador ou moderador
      const resPerfil = await strapiGet<{ id: string }>('/perfis', {
        'filters[userId][$eq]': user.id,
        'fields[0]': 'id',
      });
      const perfilId = resPerfil.data[0]?.id;
      const isCreator = String(prog.responsavel?.id) === String(perfilId) ||
        String(prog.instituicao?.id) === String(perfilId);
      const isModerator = ['moderador', 'super_admin'].includes(user.role);
      if (!isCreator && !isModerator) return c.json({ error: 'Programa não disponível' }, 404);
    }

    return c.json(prog);
  } catch {
    return c.json({ error: 'Falha ao carregar programa' }, 502);
  }
});

// POST /programas — criar programa (protegido)
programaRoutes.post('/',
  verifyJwt,
  checkRole(['mentor', 'instituicao', 'super_admin']),
  requireApproved(),
  rateLimitContentCreate,
  zValidator('json', CriarProgramaPayloadSchema),
  async (c) => {
    const user = c.get('user');
    const body = c.req.valid('json');
    const { id: userId, role } = user;
    try {
      const resPerfil = await strapiGet<{ id: string }>('/perfis', {
        'filters[userId][$eq]': userId,
        'fields[0]': 'id',
      });
      const perfilId = resPerfil.data[0]?.id;
      const criadorTipo = role === 'super_admin' ? 'super_admin' : role === 'instituicao' ? 'instituicao' : 'mentor';
      const slug = body.titulo
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      const programaData = {
        ...body,
        estado: 'draft',
        slug,
        criadorTipo,
        responsavel: perfilId,
        historicoEstados: [{ estado: 'draft', timestamp: new Date().toISOString(), autorId: userId }],
      };
      const res = await strapiPost<StrapiPrograma>('/programas', programaData);
      const programaId = res.data.id;
      const event = await eventBus.publishWithOutbox(DomainEventName.PROGRAMA_CRIADO, {
        programaId,
        autorId: String(perfilId),
        titulo: body.titulo,
        area: body.area,
        criadorTipo,
      });
      return c.json({ ...res.data, eventId: event.id }, 201);
    } catch {
      return c.json({ error: 'Falha ao criar programa' }, 502);
    }
  }
);

// POST /programas/:id/inscricao — inscrição no programa (protegido)
programaRoutes.post('/:id/inscricao', verifyJwt, async (c) => {
  const programaId = c.req.param('id');
  if (!programaId) return c.json({ error: 'Id é obrigatório' }, 400);
  const user = c.get('user');
  const { id: userId } = user;
  try {
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    const perfilId = resPerfil.data[0]?.id;
    if (!perfilId) return c.json({ error: 'Perfil não encontrado' }, 404);

    const params: Record<string, string | string[]> = {
      'filters[id][$eq]': programaId,
      'pagination[pageSize]': '1',
    };
    applyPublicCatalogStateFilter(params);
    const resPrograma = await strapiGet<StrapiPrograma>('/programas', params);
    if (!resPrograma.data[0]) return c.json({ error: 'Programa não disponível para inscrição' }, 404);

    const resDup = await strapiGet<{ id: string }>('/inscricoes-programas', {
      'filters[perfil][id][$eq]': perfilId,
      'filters[programa][id][$eq]': programaId,
      'pagination[pageSize]': '1',
    });
    if (resDup.data.length > 0) return c.json({ error: 'Já inscrito neste programa' }, 409);

    const res = await strapiPost<{ id: string }>('/inscricoes-programas', {
      perfil: perfilId,
      programa: programaId,
    });

    await eventBus.publishWithOutbox(DomainEventName.PROGRAMA_INSCRICAO, {
      programaId,
      estudanteId: userId,
    });

    return c.json({ id: res.data.id }, 201);
  } catch {
    return c.json({ error: 'Falha ao processar inscrição' }, 502);
  }
});

// PUT /programas/:id — atualizar programa (protegido)
programaRoutes.put('/:id',
  verifyJwt,
  checkRole(['mentor', 'instituicao', 'super_admin']),
  zValidator('json', CriarProgramaPayloadSchema.partial()),
  async (c) => {
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Id é obrigatório' }, 400);
    const user = c.get('user');
    const body = c.req.valid('json');
    const { id: userId, role } = user;
    try {
      const resPerfil = await strapiGet<{ id: string }>('/perfis', {
        'filters[userId][$eq]': userId,
        'fields[0]': 'id',
      });
      const perfilId = resPerfil.data[0]?.id;

      const resGet = await strapiGet<StrapiPrograma>('/programas', {
        'filters[id][$eq]': id,
        'pagination[pageSize]': '1',
        populate: 'responsavel,instituicao',
      });
      const existing = resGet.data[0];
      if (!existing) return c.json({ error: 'Programa não encontrado' }, 404);

      const podeEditar = role === 'super_admin' ||
        (role === 'mentor' && String(existing.responsavel?.id) === String(perfilId)) ||
        (role === 'instituicao' && String(existing.instituicao?.id) === String(perfilId));
      if (!podeEditar) return c.json({ error: 'Autoridade insuficiente' }, 403);

      const resPut = await strapiPut<StrapiPrograma>(`/programas/${id}`, body);
      return c.json(resPut.data);
    } catch {
      return c.json({ error: 'Falha ao atualizar programa' }, 502);
    }
  }
);

// PATCH /programas/:id/estado — transição de estado editorial (protegido)
programaRoutes.patch('/:id/estado',
  verifyJwt,
  checkRole(['mentor', 'instituicao', 'moderador', 'super_admin']),
  zValidator('json', AtualizarProgramaEstadoSchema),
  async (c) => {
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Id é obrigatório' }, 400);
    const user = c.get('user');
    const { estado, motivoRejeicao } = c.req.valid('json');
    const { id: userId, role } = user;
    try {
      const resPerfil = await strapiGet<{ id: string }>('/perfis', {
        'filters[userId][$eq]': userId,
        'fields[0]': 'id',
      });
      const perfilId = resPerfil.data[0]?.id;

      const resGet = await strapiGet<StrapiPrograma>('/programas', {
        'filters[id][$eq]': id,
        'pagination[pageSize]': '1',
        populate: 'responsavel,instituicao',
      });
      const programa = resGet.data[0];
      if (!programa) return c.json({ error: 'Programa não encontrado' }, 404);

      const estadoAtual = programa.estado;

      const transicaoPermitida = (atual: string, novo: string, userRole: string): boolean => {
        if (userRole === 'super_admin') return true;
        if (userRole === 'moderador') return novo === 'archived' && atual === 'published';
        if (userRole === 'mentor' || userRole === 'instituicao') {
          if (atual === 'draft' && novo === 'review') return true;
          if (atual === 'approved' && novo === 'published') return true;
          if (atual === 'draft' && novo === 'archived') return true;
        }
        return false;
      };

      const podeEditar = role === 'super_admin' ||
        role === 'moderador' ||
        String(programa.responsavel?.id) === String(perfilId) ||
        String(programa.instituicao?.id) === String(perfilId);
      if (!podeEditar) return c.json({ error: 'Sem permissão para editar este programa' }, 403);
      if (!transicaoPermitida(estadoAtual, estado, role)) {
        return c.json({ error: `Transição inválida de ${estadoAtual} para ${estado}` }, 400);
      }

      const novoHistorico = [...(programa.historicoEstados ?? []), {
        estado,
        timestamp: new Date().toISOString(),
        autorId: userId,
      }];

      await strapiPut<unknown>(`/programas/${id}`, {
        estado,
        motivoRejeicao: estado === 'archived' && motivoRejeicao ? motivoRejeicao : undefined,
        historicoEstados: novoHistorico,
      });

      if (estado === 'published') {
        await eventBus.publishWithOutbox(DomainEventName.PROGRAMA_PUBLICADO, {
          programaId: id,
          autorId: programa.responsavel?.id ?? 'unknown',
          titulo: programa.titulo,
          instituicaoId: programa.instituicao?.id ?? 'unknown',
        });
      }

      return c.json({ success: true });
    } catch {
      return c.json({ error: 'Falha na transição de estado' }, 502);
    }
  }
);

// POST /programas/:id/concluir — marcar programa como concluído (protegido)
programaRoutes.post('/:id/concluir', verifyJwt, async (c) => {
  const programaId = c.req.param('id');
  if (!programaId) return c.json({ error: 'Id é obrigatório' }, 400);
  const user = c.get('user');
  const { id: userId } = user;
  try {
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    const perfilId = resPerfil.data[0]?.id;
    const resInscr = await strapiGet<{ id: string }>('/inscricoes-programas', {
      'filters[perfil][id][$eq]': String(perfilId),
      'filters[programa][id][$eq]': programaId,
    });
    const existing = resInscr.data[0];
    if (!existing) return c.json({ error: 'Inscrição não encontrada' }, 404);
    await strapiPut(`/inscricoes-programas/${existing.id}`, {
      concluido: true,
      dataConclusao: new Date().toISOString(),
    });
    await eventBus.publishWithOutbox(DomainEventName.PROGRAMA_CONCLUIDO, {
      programaId,
      perfilId: String(perfilId),
    });
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Erro ao concluir programa' }, 502);
  }
});
