import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { CriarProgramaPayloadSchema, AtualizarProgramaEstadoSchema } from '@pdc/shared';

type Vars = { Variables: AuthVariables };
export const programaRoutes = new Hono<Vars>();

programaRoutes.use('*', verifyJwt);

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

// GET /programas
programaRoutes.get('/', async (c) => {
  try {
    const res = await strapiGet<StrapiPrograma>('/programas', {
      'filters[estado][$eq]': 'published',
      populate: 'capa,instituicao,responsavel,cursos,experiencias,simulacoes,projetos',
      sort: 'createdAt:desc',
    });
    return c.json(res);
  } catch (_err) {
    return c.json({ error: 'Erro ao carregar programas' }, 502);
  }
});

// GET /programas/meus (inscrições do utilizador)
programaRoutes.get('/meus', async (c) => {
  const { id: userId } = c.get('user');
  
  try {
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    const perfilId = resPerfil.data[0]?.id;

    if (!perfilId) return c.json({ data: [] });

    const res = await strapiGet<StrapiPrograma>('/inscricoes-programas', {
      'filters[perfil][id][$eq]': String(perfilId),
      populate: 'programa',
    });

    return c.json(res);
  } catch (_err) {
    return c.json({ error: 'Erro ao carregar teus programas' }, 502);
  }
});

// GET /programas/minhas (programas criados pelo utilizador)
programaRoutes.get('/minhas', checkRole(['mentor', 'instituicao', 'super_admin']), async (c) => {
  const { id: userId, role } = c.get('user');
  
  try {
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    const perfilId = resPerfil.data[0]?.id;

    if (!perfilId) return c.json({ error: 'Perfil não encontrado' }, 404);

    const params: Record<string, string> = {
      populate: 'capa,instituicao,responsavel,cursos,experiencias,simulacoes,projetos',
    };

    // Filtrar por criador baseado na role
    if (role === 'mentor' || role === 'super_admin') {
      params['filters[responsavel][id][$eq]'] = String(perfilId);
    } else if (role === 'instituicao') {
      params['filters[instituicao][id][$eq]'] = String(perfilId);
    }

    const res = await strapiGet<StrapiPrograma>('/programas', params);
    return c.json(res);
  } catch (_err) {
    return c.json({ error: 'Erro ao carregar programas criados' }, 502);
  }
});

// POST /programas - Criar novo programa
programaRoutes.post('/', 
  checkRole(['mentor', 'instituicao', 'super_admin']),
  zValidator('json', CriarProgramaPayloadSchema),
  async (c) => {
    const body = c.req.valid('json');
    const { id: userId, role } = c.get('user');

    try {
      // Buscar perfil
      const resPerfil = await strapiGet<{ id: string }>('/perfis', {
        'filters[userId][$eq]': userId,
        'fields[0]': 'id',
      });
      const perfilId = resPerfil.data[0]?.id;

      // Determinar criadorTipo baseado na role
      const criadorTipo = role === 'super_admin' ? 'super_admin' : 
                          role === 'instituicao' ? 'instituicao' : 'mentor';

      const slug = body.titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

      const programaData = {
        ...body,
        estado: 'draft',
        slug,
        criadorTipo,
        responsavel: perfilId,
        historicoEstados: [{
          estado: 'draft',
          timestamp: new Date().toISOString(),
          autorId: userId,
        }],
      };

      const res = await strapiPost<StrapiPrograma>('/programas', programaData);
      const programaId = res.data.id;

      // G15: Impacto no Ecossistema
      const event = await eventBus.publishWithOutbox(DomainEventName.PROGRAMA_CRIADO, {
        programaId,
        autorId: String(perfilId),
        titulo: body.titulo,
        area: body.area,
        criadorTipo,
      });

      return c.json({
        ...res.data,
        eventId: event?.id
      }, 201);
    } catch (_err) {
      return c.json({ error: 'Falha ao criar programa' }, 502);
    }
  }
);

// PUT /programas/:id - Atualizar programa
programaRoutes.put('/:id', 
  checkRole(['mentor', 'instituicao', 'super_admin']),
  zValidator('json', CriarProgramaPayloadSchema.partial()),
  async (c) => {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const { id: userId, role } = c.get('user');

    try {
      // Buscar perfil do utilizador atual
      const resPerfil = await strapiGet<{ id: string }>('/perfis', {
        'filters[userId][$eq]': userId,
        'fields[0]': 'id',
      });
      const perfilId = resPerfil.data[0]?.id;

      // Verificar propriedade
      const resGet = await strapiGet<StrapiPrograma>(`/programas/${id}`, {
        populate: 'responsavel,instituicao',
      });
      const existing = resGet.data[0];

      if (!existing) return c.json({ error: 'Programa não encontrado' }, 404);

      // Verificar permissões
      const podeEditar = role === 'super_admin' || 
                        (role === 'mentor' && String(existing.responsavel?.id) === String(perfilId)) ||
                        (role === 'instituicao' && String(existing.instituicao?.id) === String(perfilId));

      if (!podeEditar) {
        return c.json({ error: 'Autoridade insuficiente' }, 403);
      }

      const resPut = await strapiPut<StrapiPrograma>(`/programas/${id}`, body);
      return c.json(resPut.data);
    } catch (_err) {
      return c.json({ error: 'Falha ao atualizar programa' }, 502);
    }
  }
);

// PATCH /programas/:id/estado - Transição de estado editorial
programaRoutes.patch('/:id/estado', 
  checkRole(['mentor', 'instituicao', 'moderador', 'super_admin']),
  zValidator('json', AtualizarProgramaEstadoSchema),
  async (c) => {
    const id = c.req.param('id');
    const { estado, motivoRejeicao } = c.req.valid('json');
    const { id: userId, role } = c.get('user');

    try {
      // Buscar perfil do utilizador atual
      const resPerfil = await strapiGet<{ id: string }>('/perfis', {
        'filters[userId][$eq]': userId,
        'fields[0]': 'id',
      });
      const perfilId = resPerfil.data[0]?.id;

      const resGet = await strapiGet<StrapiPrograma>(`/programas/${id}`, {
        populate: 'responsavel,instituicao',
      });
      const programa = resGet.data[0];

      if (!programa) return c.json({ error: 'Programa não encontrado' }, 404);

      const estadoAtual = programa.estado;

      // Validar transições permitidas
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

      if (!podeEditar) {
        return c.json({ error: 'Sem permissão para editar este programa' }, 403);
      }

      if (!transicaoPermitida(estadoAtual, estado, role)) {
        return c.json({
          error: `Transição inválida de ${estadoAtual} para ${estado}`,
        }, 400);
      }

      // Atualizar histórico
      const historicoAtual = programa.historicoEstados || [];
      const novoHistorico = [...historicoAtual, {
        estado,
        timestamp: new Date().toISOString(),
        autorId: userId,
      }];

      await strapiPut<unknown>(`/programas/${id}`, { 
        estado, 
        motivoRejeicao: estado === 'archived' && motivoRejeicao ? motivoRejeicao : undefined,
        historicoEstados: novoHistorico,
      });

      // G15: Evento se publicado
      if (estado === 'published') {
        const responsavelId = programa.responsavel?.id;
        const instituicaoId = programa.instituicao?.id;

        await eventBus.publishWithOutbox(DomainEventName.PROGRAMA_PUBLICADO, {
          programaId: id,
          autorId: responsavelId ? String(responsavelId) : 'unknown',
          titulo: programa.titulo,
          instituicaoId: instituicaoId ? String(instituicaoId) : null,
        });
      }

      return c.json({ success: true });
    } catch (_err) {
      return c.json({ error: 'Falha na transição de estado' }, 502);
    }
  }
);

// POST /programas/:id/concluir
programaRoutes.post('/:id/concluir', async (c) => {
  const programaId = c.req.param('id');
  const { id: userId } = c.get('user');

  try {
    const resPerfil = await strapiGet<{ id: string }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
    });
    const perfilId = resPerfil.data[0]?.id;

    const resInscr = await strapiGet<StrapiPrograma>('/inscricoes-programas', {
      'filters[perfil][id][$eq]': String(perfilId),
      'filters[programa][id][$eq]': programaId,
    });

    const existing = resInscr.data[0];
    if (!existing) return c.json({ error: 'Inscrição não encontrada' }, 404);

    await strapiPut(`/inscricoes-programas/${existing.id}`, {
      concluido: true,
      dataConclusao: new Date().toISOString(),
      metadata: {
        ...(existing.metadata || {}),
        concluidoVia: 'api',
      }
    });

    // G15: Impacto no Ecossistema
    await eventBus.publishWithOutbox(DomainEventName.PROGRAMA_CONCLUIDO, {
      programaId,
      perfilId: String(perfilId),
    });

    return c.json({ success: true });
  } catch (_err) {
    return c.json({ error: 'Erro ao concluir programa' }, 502);
  }
});
